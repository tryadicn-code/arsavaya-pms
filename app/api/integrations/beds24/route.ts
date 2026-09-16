import { getChatGPTUser } from '../../../chatgpt-auth';
import type { State } from '../../../../lib/pms';
import { db } from '../../../../lib/storage';
import { Beds24Adapter } from '../../../../lib/integrations/beds24/adapter';
import { isConfigured } from '../../../../lib/integrations/beds24/auth';
import { runBeds24Sync } from '../../../../lib/integrations/beds24/sync';
import {
  getAccount,
  upsertAccount,
  listUnitMappings,
  upsertUnitMapping,
  getLatestSyncRun,
  listSyncRuns,
  listIntegrationIssues,
  integrationDb,
} from '../../../../lib/integrations/db';
import { computeSyncHealth } from '../../../../lib/integrations/sync-health';
import { createUnitMapping } from '../../../../lib/integrations/unit-mapping';
import { decideMappingSave } from '../../../../lib/integrations/beds24/mapping';

export const dynamic = 'force-dynamic';

const response = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function identity(req: Request): Promise<string | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (new URL(req.url).searchParams.get('demo') === '1') return null;
  return 'live:' + user.userId;
}

async function loadWorkspace(key: string): Promise<{ version: number; state: unknown } | null> {
  const d = db();
  const row = await d
    .prepare('SELECT version,data FROM pms_workspace WHERE id=?')
    .bind(key)
    .first<{ version: number; data: string }>();
  if (!row) return null;
  return { version: row.version, state: JSON.parse(row.data) };
}

async function saveWorkspace(key: string, version: number, state: unknown): Promise<boolean> {
  const d = db();
  const r = await d
    .prepare('UPDATE pms_workspace SET data=?,version=version+1 WHERE id=? AND version=?')
    .bind(JSON.stringify(state), key, version)
    .run();
  return !!r.meta.changes;
}

export async function POST(req: Request) {
  try {
    const key = await identity(req);
    if (!key) return response({ error: 'Silakan masuk untuk mengakses integrasi.' }, 401);
    if (req.headers.get('sec-fetch-site') === 'cross-site') {
      return response({ error: 'Permintaan ditolak.' }, 403);
    }

    const raw = await req.text();
    if (raw.length > 20000) return response({ error: 'Permintaan terlalu besar.' }, 413);
    const { action, payload } = JSON.parse(raw);
    const d1 = integrationDb();
    const accountId = key + ':beds24';

    if (action === 'status') {
      const account = await getAccount(d1, key, 'beds24');
      const mappings = await listUnitMappings(d1, accountId);
      const last = await getLatestSyncRun(d1, accountId);
      const ws = (await loadWorkspace(key)) as {
        version: number;
        state: { units?: unknown[] };
      } | null;
      const totalUnits = ws?.state?.units?.length ?? 0;
      const confirmed = mappings.filter((m) => m.confirmed).length;
      const health = computeSyncHealth({
        configured: isConfigured(),
        connected: account?.status === 'CONNECTED' || account?.status === 'HEALTHY',
        mappedUnits: confirmed,
        totalUnits,
        lastSuccessAt: account?.lastSyncAt,
        lastError: account?.lastError,
      });
      return response({
        provider: 'beds24',
        configured: isConfigured(),
        health,
        account: account
          ? { status: account.status, lastSyncAt: account.lastSyncAt, lastError: account.lastError }
          : null,
        mapping: { total: totalUnits, confirmed, pending: totalUnits - confirmed },
        lastSyncRun: last
          ? {
              status: last.status,
              startedAt: last.startedAt,
              finishedAt: last.finishedAt,
              receivedCount: last.receivedCount,
              createdCount: last.createdCount,
              updatedCount: last.updatedCount,
              cancelledCount: last.cancelledCount,
              conflictCount: last.conflictCount,
              errorCount: last.errorCount,
              lastError: last.lastError,
            }
          : null,
      });
    }

    if (action === 'test') {
      const existing = await getAccount(d1, key, 'beds24');
      const adapter = new Beds24Adapter({ accountId, workspace: key });
      const result = await adapter.testConnection();
      const now = new Date().toISOString();

      await upsertAccount(d1, {
        id: accountId,
        workspace: key,
        provider: 'beds24',
        status: result.ok ? 'CONNECTED' : 'ERROR',
        externalAccountId: existing?.externalAccountId ?? null,
        credentialSource: 'env:BEDS24_READ_TOKEN',
        configJson: existing?.configJson ?? null,

        // Connection test is NOT a synchronization.
        // Only a real successful sync may set lastSyncAt.
        lastSyncAt: existing?.lastSyncAt ?? null,

        lastError: result.ok ? null : result.message ?? 'unknown',

        // Preserve account creation timestamp across test re-runs.
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });

      return response({ ok: result.ok, message: result.message });
    }

    if (action === 'properties') {
      const adapter = new Beds24Adapter({ accountId, workspace: key });
      const properties = await adapter.getProperties();
      const units = await adapter.getUnits();
      return response({ properties, units });
    }

    if (action === 'mappings') {
      const mappings = await listUnitMappings(d1, accountId);
      return response({ mappings });
    }

    if (action === 'mapping-save') {
      const { localUnitId, externalPropertyId, externalUnitId } = payload ?? {};
      if (!localUnitId || !externalPropertyId || !externalUnitId) {
        return response(
          { error: 'localUnitId, externalPropertyId, externalUnitId wajib.' },
          400,
        );
      }

      const existing = await listUnitMappings(d1, accountId);
      const decision = decideMappingSave(existing, {
        localUnitId,
        externalPropertyId,
        externalUnitId,
      });

      if (decision.kind === 'unchanged') {
        // Idempotent: exact same mapping already exists.
        return response({
          ok: true,
          mapping: decision.mapping,
          unchanged: true,
        });
      }

      if (decision.kind === 'conflict-external') {
        return response(
          {
            error: 'External unit sudah dipetakan ke unit lokal lain.',
            existing: {
              localUnitId: decision.existing.localUnitId,
              externalPropertyId: decision.existing.externalPropertyId,
              externalUnitId: decision.existing.externalUnitId,
            },
          },
          409,
        );
      }

      if (decision.kind === 'conflict-local') {
        return response(
          {
            error:
              'Unit lokal sudah dipetakan ke external unit lain. Hapus mapping lama terlebih dahulu.',
            existing: {
              localUnitId: decision.existing.localUnitId,
              externalPropertyId: decision.existing.externalPropertyId,
              externalUnitId: decision.existing.externalUnitId,
            },
          },
          409,
        );
      }

      // kind === 'create'
      const now = new Date().toISOString();
      const m = createUnitMapping({
        id: crypto.randomUUID(),
        accountId,
        workspace: key,
        localUnitId,
        externalPropertyId,
        externalUnitId,
        confirmed: true,
        now,
      });
      await upsertUnitMapping(d1, m);
      return response({ ok: true, mapping: m });
    }

        // --- history (provider-neutral sync runs) ---
    if (action === 'history') {
      const runs = await listSyncRuns(d1, accountId, {
        limit: payload?.limit,
      });
      return response({
        provider: 'beds24',
        runs,
      });
    }

    // --- issues (NEEDS_REVIEW / CONFLICT) ---
    if (action === 'issues') {
      const issues = await listIntegrationIssues(d1, accountId, {
        limit: payload?.limit,
      });
      return response({
        provider: 'beds24',
        issues,
      });
    }

    if (action === 'sync') {
      const mode = payload?.mode === 'incremental' ? 'incremental' : 'initial';
      if (!isConfigured()) {
        return response({ error: 'Beds24 token belum dikonfigurasi.' }, 400);
      }
      const adapter = new Beds24Adapter({ accountId, workspace: key });
      const result = await runBeds24Sync(mode, {
        adapter,
        db: d1,
        workspace: key,
        accountId,
        provider: 'beds24',
        loadWorkspace: () =>
          loadWorkspace(key) as Promise<{ version: number; state: State } | null>,
        saveWorkspace: (v, s) => saveWorkspace(key, v, s),
      });
      const acc = await getAccount(d1, key, 'beds24');
      const now = new Date().toISOString();
      await upsertAccount(d1, {
        id: accountId,
        workspace: key,
        provider: 'beds24',
        status: result.run.status === 'FAILED' ? 'ERROR' : 'CONNECTED',
        externalAccountId: acc?.externalAccountId ?? null,
        credentialSource: 'env:BEDS24_READ_TOKEN',
        configJson: acc?.configJson ?? null,
        lastSyncAt: result.run.status === 'SUCCESS' ? now : acc?.lastSyncAt ?? null,
        lastError: result.errors[0] ?? null,
        createdAt: acc?.createdAt ?? now,
        updatedAt: now,
      });
      return response({
        run: result.run,
        applied: result.applied,
        errors: result.errors,
      });
    }

    return response({ error: 'Action tidak dikenali.' }, 400);
  } catch (e) {
    console.error(e);
    return response({ error: (e as Error).message || 'Integrasi gagal.' }, 500);
  }
}

export async function GET() {
  return response({ error: 'Gunakan POST untuk integrasi.' }, 405);
}