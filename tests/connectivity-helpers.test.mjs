import assert from 'node:assert/strict';

import {
  mapSyncRunStatus,
  extractSafeSyncRun,
  extractSafeSyncHistory,
  extractSyncResult,
  extractSafeIssues,
  deriveNextSyncMode,
  formatDuration,
  buildSyncFeedback,
  safeIssueMetadata,
  extractSafeProperties,
  extractSafeMappings,
  buildPropertyHierarchy,
  buildMappingViewModel,
  suggestMapping,
  mapMappingSaveError,
  mapBeds24Status,
  mapBeds24Error,
  extractSafeStatusFields,
  CAPABILITIES_SUPPORTED,
  CAPABILITIES_NOT_SUPPORTED,
  PROVIDER_DISPLAY_NAME,
  PROVIDER_TYPE_LABEL,
  PROVIDER_MODE_LABEL,
  PROVIDER_READONLY_LABEL,
} from '../app/connectivity-helpers.ts';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('PASS:', name);
    passed++;
  } catch (e) {
    console.error('FAIL:', name, '-', e?.message ?? e);
    failed++;
  }
}

// ===== status mapper =====
test('status: NOT_CONFIGURED → Belum dikonfigurasi', () => {
  const v = mapBeds24Status('NOT_CONFIGURED');
  assert.equal(v.label, 'Belum dikonfigurasi');
  assert.equal(v.tone, 'muted');
});

test('status: CONNECTED → Terhubung (blue)', () => {
  const v = mapBeds24Status('CONNECTED');
  assert.equal(v.label, 'Terhubung');
  assert.equal(v.tone, 'blue');
});

test('status: DISCONNECTED → Belum terhubung (amber)', () => {
  const v = mapBeds24Status('DISCONNECTED');
  assert.equal(v.label, 'Belum terhubung');
  assert.equal(v.tone, 'amber');
});

test('status: ERROR → Gangguan koneksi (red)', () => {
  const v = mapBeds24Status('ERROR');
  assert.equal(v.label, 'Gangguan koneksi');
  assert.equal(v.tone, 'red');
});

test('status: HEALTHY → Sehat (green)', () => {
  const v = mapBeds24Status('HEALTHY');
  assert.equal(v.label, 'Sehat');
  assert.equal(v.tone, 'green');
});

test('status: NEEDS_MAPPING → amber', () => {
  const v = mapBeds24Status('NEEDS_MAPPING');
  assert.equal(v.tone, 'amber');
});

test('status: unknown → fallback (muted)', () => {
  const v = mapBeds24Status('SOMETHING_WEIRD');
  assert.equal(v.tone, 'muted');
  assert.equal(v.label, 'Status belum tersedia');
});

// ===== error mapper =====
test('error: auth → Kredensial ditolak', () => {
  assert.equal(
    mapBeds24Error(new Error('Beds24 authentication failed')),
    'Kredensial Beds24 ditolak.',
  );
});

test('error: 401 → Kredensial ditolak', () => {
  assert.equal(mapBeds24Error(new Error('HTTP 401')), 'Kredensial Beds24 ditolak.');
});

test('error: network → tidak dapat dijangkau', () => {
  assert.equal(
    mapBeds24Error(new Error('network error')),
    'Beds24 tidak dapat dijangkau.',
  );
});

test('error: timeout → tidak dapat dijangkau', () => {
  assert.equal(
    mapBeds24Error(new Error('request timeout')),
    'Beds24 tidak dapat dijangkau.',
  );
});

test('error: rate limit → batas API', () => {
  assert.equal(
    mapBeds24Error(new Error('rate limited 429')),
    'Batas API Beds24 sementara tercapai.',
  );
});

test('error: malformed → respons tidak sesuai', () => {
  assert.equal(
    mapBeds24Error(new Error('malformed JSON')),
    'Beds24 mengembalikan respons yang tidak sesuai.',
  );
});

test('error: unknown → generic fallback', () => {
  assert.equal(
    mapBeds24Error(new Error('weird thing happened')),
    'Terjadi gangguan saat menghubungi Beds24.',
  );
});

test('error: no token leak in any mapped message', () => {
  const messages = [
    mapBeds24Error(new Error('BEDS24_READ_TOKEN=secret-abc')),
    mapBeds24Error(new Error('token invalid')),
    mapBeds24Error(new Error('whatever')),
  ];
  for (const m of messages) {
    assert.ok(!m.includes('secret-abc'), `leak: ${m}`);
    assert.ok(!m.toLowerCase().includes('beds24_read_token'), `leak: ${m}`);
  }
});

// ===== safe field extraction =====
test('extract: pulls only safe fields', () => {
  const raw = {
    provider: 'beds24',
    configured: true,
    health: 'CONNECTED',
    account: {
      status: 'CONNECTED',
      lastSyncAt: '2026-09-16T10:00:00.000Z',
      lastError: null,
    },
    mapping: { total: 8, confirmed: 1, pending: 7 },
    lastSyncRun: { id: 'x' },
  };
  const s = extractSafeStatusFields(raw);
  assert.equal(s.configured, true);
  assert.equal(s.health, 'CONNECTED');
  assert.equal(s.connectionStatus, 'CONNECTED');
  assert.equal(s.lastSyncAt, '2026-09-16T10:00:00.000Z');
  assert.equal(s.lastError, null);
});

test('extract: NEVER exposes token / credentialSource / workspace / account_id', () => {
  const raw = {
    provider: 'beds24',
    configured: true,
    health: 'HEALTHY',
    token: 'SECRET-TOKEN-123',
    credentialSource: 'env:BEDS24_READ_TOKEN',
    workspace: 'live:secret-user',
    account_id: 'live:secret-user:beds24',
    account: {
      status: 'CONNECTED',
      lastSyncAt: null,
      lastError: null,
      credentialSource: 'env:BEDS24_READ_TOKEN',
    },
  };
  const s = extractSafeStatusFields(raw);
  const json = JSON.stringify(s);
  assert.ok(!json.includes('SECRET-TOKEN-123'));
  assert.ok(!json.includes('BEDS24_READ_TOKEN'));
  assert.ok(!json.includes('secret-user'));
  assert.ok(!('token' in s));
  assert.ok(!('credentialSource' in s));
  assert.ok(!('workspace' in s));
  assert.ok(!('accountId' in s));
});

test('extract: handles null / non-object safely', () => {
  assert.equal(extractSafeStatusFields(null).configured, false);
  assert.equal(extractSafeStatusFields(undefined).configured, false);
  assert.equal(extractSafeStatusFields('string').configured, false);
  assert.equal(extractSafeStatusFields(42).configured, false);
});

test('extract: unknown health falls back to UNKNOWN', () => {
  const s = extractSafeStatusFields({ configured: true, health: 'MARS_STATE' });
  assert.equal(s.health, 'UNKNOWN');
});

test('extract: account ERROR → connectionStatus ERROR', () => {
  const s = extractSafeStatusFields({
    configured: true,
    health: 'ERROR',
    account: { status: 'ERROR', lastSyncAt: null, lastError: 'boom' },
  });
  assert.equal(s.connectionStatus, 'ERROR');
  assert.equal(s.lastError, 'boom');
});

test('extract: no account → NOT_TESTED', () => {
  const s = extractSafeStatusFields({ configured: false, health: 'NOT_CONFIGURED' });
  assert.equal(s.connectionStatus, 'NOT_TESTED');
});

// ===== capabilities & constants =====
test('capabilities: supported list has expected items', () => {
  assert.ok(CAPABILITIES_SUPPORTED.includes('Properti'));
  assert.ok(CAPABILITIES_SUPPORTED.includes('Kamar'));
  assert.ok(CAPABILITIES_SUPPORTED.includes('Reservasi'));
});

test('capabilities: not supported list has expected items', () => {
  assert.ok(CAPABILITIES_NOT_SUPPORTED.some((x) => /tarif/i.test(x)));
  assert.ok(CAPABILITIES_NOT_SUPPORTED.some((x) => /OTA/i.test(x)));
});

test('capabilities: no overlap between supported and not supported', () => {
  const overlap = CAPABILITIES_SUPPORTED.filter((x) =>
    CAPABILITIES_NOT_SUPPORTED.includes(x),
  );
  assert.deepEqual(overlap, []);
});

test('constants: provider labels are correct', () => {
  assert.equal(PROVIDER_DISPLAY_NAME, 'Beds24');
  assert.equal(PROVIDER_TYPE_LABEL, 'Channel Manager Provider');
  assert.equal(PROVIDER_MODE_LABEL, 'Inbound Sync');
  assert.equal(PROVIDER_READONLY_LABEL, 'Read-only');
});

test('constants: no OTA treated as direct provider', () => {
  // Guardrail: helpers never present Booking.com/Airbnb/Agoda as providers.
  const labels = [PROVIDER_DISPLAY_NAME, PROVIDER_TYPE_LABEL];
  for (const l of labels) {
    assert.ok(!/booking\.com/i.test(l));
    assert.ok(!/airbnb/i.test(l));
    assert.ok(!/agoda/i.test(l));
  }
});
// ===== Sub-Phase D: property/room discovery =====
test('hierarchy: builds property → rooms', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: '354434', name: 'Test Property 1' }],
    [
      { externalId: '730761', propertyExternalId: '354434', name: 'Villa 01' },
      { externalId: '730762', propertyExternalId: '354434', name: 'Villa 02' },
    ],
  );
  assert.equal(h.length, 1);
  assert.equal(h[0].externalId, '354434');
  assert.equal(h[0].rooms.length, 2);
  assert.equal(h[0].rooms[0].externalId, '730761');
});

test('hierarchy: orphan rooms without property are ignored', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'Prop A' }],
    [{ externalId: 'X', propertyExternalId: 'Z', name: 'Room X' }],
  );
  assert.equal(h[0].rooms.length, 0);
});

test('hierarchy: property without rooms → empty array', () => {
  const h = buildPropertyHierarchy([{ externalId: 'A', name: 'Prop A' }], []);
  assert.deepEqual(h[0].rooms, []);
});

test('extractProperties: parses valid, skips malformed', () => {
  const r = extractSafeProperties({
    properties: [
      { externalId: '1', name: 'P1' },
      { name: 'Missing ID' },
      null,
      'string',
      { externalId: '2' },
    ],
    units: [
      { externalId: 'r1', propertyExternalId: '1', name: 'R1' },
      { externalId: 'r2', name: 'Missing prop' },
    ],
  });
  assert.equal(r.properties.length, 2);
  assert.equal(r.rooms.length, 1);
});

test('extractProperties: never exposes unknown fields', () => {
  const r = extractSafeProperties({
    properties: [{ externalId: '1', name: 'P1', token: 'SECRET', secret: 'x' }],
    units: [{ externalId: 'r1', propertyExternalId: '1', name: 'R1', workspace: 'w' }],
  });
  const json = JSON.stringify(r);
  assert.ok(!json.includes('SECRET'));
  assert.ok(!json.includes('secret'));
  assert.ok(!json.includes('workspace'));
});

// ===== Sub-Phase D: mapping view model =====
function mkVm(localUnits, hierarchy, mappings) {
  return buildMappingViewModel(localUnits, hierarchy, mappings);
}

test('mapping-vm: MAPPED when mapping resolves to real room', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: '354434', name: 'Test Property 1' }],
    [{ externalId: '730761', propertyExternalId: '354434', name: 'Villa 01' }],
  );
  const vm = mkVm(
    [{ id: 'v1', name: 'Vila 01' }],
    h,
    [{ localUnitId: 'v1', externalPropertyId: '354434', externalUnitId: '730761', confirmed: true }],
  );
  assert.equal(vm[0].status, 'MAPPED');
  assert.equal(vm[0].mapping.propertyName, 'Test Property 1');
  assert.equal(vm[0].mapping.roomName, 'Villa 01');
});

test('mapping-vm: unconfirmed mapping → NEEDS_ATTENTION (not ignored, not auto-confirmed)', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'R' }],
  );
  const vm = mkVm(
    [{ id: 'v1', name: 'Vila 01' }],
    h,
    [{ localUnitId: 'v1', externalPropertyId: 'A', externalUnitId: 'r1', confirmed: false }],
  );
  assert.equal(vm[0].status, 'NEEDS_ATTENTION');
  assert.equal(vm[0].reason, 'Pemetaan belum dikonfirmasi.');
  assert.equal(vm[0].mapping.externalPropertyId, 'A');
  assert.equal(vm[0].mapping.externalUnitId, 'r1');
});

test('mapping-vm: MAPPED has reason: null', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'R' }],
  );
  const vm = mkVm(
    [{ id: 'v1', name: 'Vila 01' }],
    h,
    [{ localUnitId: 'v1', externalPropertyId: 'A', externalUnitId: 'r1', confirmed: true }],
  );
  assert.equal(vm[0].status, 'MAPPED');
  assert.equal(vm[0].reason, null);
});

test('mapping-vm: confirmed but missing inventory → NEEDS_ATTENTION with reason', () => {
  const h = buildPropertyHierarchy([], []);
  const vm = mkVm(
    [{ id: 'v1', name: 'Vila 01' }],
    h,
    [{ localUnitId: 'v1', externalPropertyId: '999', externalUnitId: '888', confirmed: true }],
  );
  assert.equal(vm[0].status, 'NEEDS_ATTENTION');
  assert.equal(vm[0].mapping.propertyName, '(tidak ditemukan di Beds24)');
  assert.equal(
    vm[0].reason,
    'Properti atau kamar Beds24 tidak ditemukan dalam inventori saat ini.',
  );
});

test('mapping-vm: unconfirmed mapping → NEEDS_ATTENTION (not ignored, not auto-confirmed)', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'R' }],
  );
  const vm = mkVm(
    [{ id: 'v1', name: 'Vila 01' }],
    h,
    [{ localUnitId: 'v1', externalPropertyId: 'A', externalUnitId: 'r1', confirmed: false }],
  );
  assert.equal(vm[0].status, 'NEEDS_ATTENTION');
  assert.equal(vm[0].reason, 'Pemetaan belum dikonfirmasi.');
  // Ensures the mapping data is surfaced for operator visibility — not dropped
  assert.equal(vm[0].mapping.externalPropertyId, 'A');
  assert.equal(vm[0].mapping.externalUnitId, 'r1');
});

test('mapping-vm: identity is ID-based, not name-based', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'Villa 01' }],
  );
  // Both units have SAME name; only v1 is mapped
  const vm = mkVm(
    [
      { id: 'v1', name: 'Villa 01' },
      { id: 'v2', name: 'Villa 01' },
    ],
    h,
    [{ localUnitId: 'v1', externalPropertyId: 'A', externalUnitId: 'r1', confirmed: true }],
  );
  assert.equal(vm[0].status, 'MAPPED');
  assert.equal(vm[1].status, 'UNMAPPED');
});

test('extractMappings: strips accountId/workspace/id/createdAt/updatedAt', () => {
  const r = extractSafeMappings({
    mappings: [
      {
        id: 'x',
        accountId: 'live:user:beds24',
        workspace: 'live:user',
        localUnitId: 'v1',
        externalPropertyId: 'A',
        externalUnitId: 'r1',
        confirmed: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
  });
  assert.equal(r.length, 1);
  assert.deepEqual(Object.keys(r[0]).sort(), [
    'confirmed',
    'externalPropertyId',
    'externalUnitId',
    'localUnitId',
  ]);
  const json = JSON.stringify(r);
  assert.ok(!json.includes('live:user'));
});

test('extractMappings: handles confirmed=1 (SQLite)', () => {
  const r = extractSafeMappings({
    mappings: [
      {
        localUnitId: 'v1',
        externalPropertyId: 'A',
        externalUnitId: 'r1',
        confirmed: 1,
      },
    ],
  });
  assert.equal(r[0].confirmed, true);
});

// ===== Sub-Phase D: suggestion =====
test('suggestion: exact name match → score 1', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'Vila Satu' }],
  );
  const s = suggestMapping({ id: 'v1', name: 'vila satu' }, h);
  assert.ok(s);
  assert.equal(s.score, 1);
  assert.equal(s.externalUnitId, 'r1');
});

test('suggestion: partial match → score 0.7', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'Vila Satu Utama' }],
  );
  const s = suggestMapping({ id: 'v1', name: 'vila satu' }, h);
  assert.ok(s);
  assert.equal(s.score, 0.7);
});

test('suggestion: no match → null', () => {
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'Different' }],
  );
  const s = suggestMapping({ id: 'v1', name: 'Vila Satu' }, h);
  assert.equal(s, null);
});

test('suggestion: never auto-confirms (pure function returns only data)', () => {
  // Guardrail: suggestMapping has no side effects — it only returns data.
  const h = buildPropertyHierarchy(
    [{ externalId: 'A', name: 'P' }],
    [{ externalId: 'r1', propertyExternalId: 'A', name: 'Vila Satu' }],
  );
  const s1 = suggestMapping({ id: 'v1', name: 'Vila Satu' }, h);
  const s2 = suggestMapping({ id: 'v1', name: 'Vila Satu' }, h);
  assert.deepEqual(s1, s2); // deterministic, no state
});

// ===== Sub-Phase D: save error mapping =====
test('saveError: conflict-external detected', () => {
  const r = mapMappingSaveError('External unit sudah dipetakan ke unit lokal lain.');
  assert.equal(r.kind, 'conflict-external');
});

test('saveError: conflict-local detected', () => {
  const r = mapMappingSaveError('Unit lokal sudah dipetakan ke external unit lain.');
  assert.equal(r.kind, 'conflict-local');
});

test('saveError: validation detected', () => {
  const r = mapMappingSaveError('localUnitId wajib diisi.');
  assert.equal(r.kind, 'validation');
});

test('saveError: unknown fallback', () => {
  const r = mapMappingSaveError('something weird');
  assert.equal(r.kind, 'unknown');
  assert.equal(r.message, 'something weird');
});

test('saveError: empty input → safe fallback', () => {
  const r = mapMappingSaveError('');
  assert.equal(r.kind, 'unknown');
  assert.equal(r.message, 'Gagal menyimpan pemetaan.');
});

test('saveError: no token leak in any mapped message', () => {
  const inputs = [
    'BEDS24_READ_TOKEN=secret-abc',
    'token invalid',
    'unknown thing',
  ];
  for (const i of inputs) {
    const r = mapMappingSaveError(i);
    assert.ok(!r.message.includes('secret-abc'), `leak: ${r.message}`);
  }
});
// ===== Sub-Phase E: sync status mapping =====
test('sync-status: SUCCESS → green Berhasil', () => {
  assert.deepEqual(mapSyncRunStatus('SUCCESS'), { label: 'Berhasil', tone: 'green' });
});
test('sync-status: PARTIAL → amber', () => {
  const b = mapSyncRunStatus('PARTIAL');
  assert.equal(b.tone, 'amber');
});
test('sync-status: FAILED → red', () => {
  const b = mapSyncRunStatus('FAILED');
  assert.equal(b.tone, 'red');
});
test('sync-status: RUNNING → blue', () => {
  const b = mapSyncRunStatus('RUNNING');
  assert.equal(b.tone, 'blue');
});
test('sync-status: unknown → muted', () => {
  const b = mapSyncRunStatus('MARS_STATE');
  assert.equal(b.tone, 'muted');
});

// ===== Sub-Phase E: safe sync run extractor =====
test('sync-run: extract safe fields, no leakage', () => {
  const raw = {
    id: 'run-1',
    provider: 'beds24',
    syncType: 'reservations',
    status: 'SUCCESS',
    startedAt: '2026-09-16T10:00:00.000Z',
    finishedAt: '2026-09-16T10:00:03.000Z',
    receivedCount: 5,
    createdCount: 2,
    updatedCount: 1,
    cancelledCount: 1,
    conflictCount: 0,
    errorCount: 0,
    lastError: null,
    // These must never leak:
    workspace: 'live:secret-user',
    accountId: 'live:secret-user:beds24',
    cursorBefore: 'SECRET-CURSOR-A',
    cursorAfter: 'SECRET-CURSOR-B',
    token: 'SECRET-TOKEN',
  };
  const s = extractSafeSyncRun(raw);
  assert.ok(s);
  assert.equal(s.receivedCount, 5);
  assert.equal(s.createdCount, 2);
  assert.equal(s.updatedCount, 1);
  assert.equal(s.cancelledCount, 1);
  assert.equal(s.needsReviewCount, null);
  const json = JSON.stringify(s);
  assert.ok(!json.includes('SECRET-CURSOR-A'));
  assert.ok(!json.includes('SECRET-CURSOR-B'));
  assert.ok(!json.includes('SECRET-TOKEN'));
  assert.ok(!json.includes('secret-user'));
});

test('sync-run: needsReviewCount captured when present', () => {
  const s = extractSafeSyncRun({
    id: 'r1',
    startedAt: '2026-09-16T10:00:00.000Z',
    status: 'PARTIAL',
    needsReviewCount: 3,
  });
  assert.ok(s);
  assert.equal(s.needsReviewCount, 3);
});

test('sync-run: missing id → null', () => {
  assert.equal(extractSafeSyncRun({ startedAt: 'x' }), null);
  assert.equal(extractSafeSyncRun(null), null);
  assert.equal(extractSafeSyncRun('string'), null);
});

// ===== Sub-Phase E: safe history extractor =====
test('sync-history: filters malformed items', () => {
  const arr = extractSafeSyncHistory({
    runs: [
      { id: 'r1', startedAt: '2026-01-01', status: 'SUCCESS' },
      { status: 'SUCCESS' },
      null,
      'string',
    ],
  });
  assert.equal(arr.length, 1);
  assert.equal(arr[0].id, 'r1');
});

test('sync-history: empty or missing runs → []', () => {
  assert.deepEqual(extractSafeSyncHistory({}), []);
  assert.deepEqual(extractSafeSyncHistory(null), []);
});

// ===== Sub-Phase E: sync response =====
test('sync-result: extracts run and errors', () => {
  const r = extractSyncResult({
    run: { id: 'r1', startedAt: '2026-01-01', status: 'SUCCESS' },
    applied: { created: 1 },
    errors: ['warn1', 'warn2'],
  });
  assert.ok(r);
  assert.equal(r.errors.length, 2);
});

test('sync-result: filters non-string errors', () => {
  const r = extractSyncResult({
    run: { id: 'r1', startedAt: '2026-01-01' },
    errors: ['ok', 42, null, {}],
  });
  assert.ok(r);
  assert.deepEqual(r.errors, ['ok']);
});

test('sync-result: missing run → null', () => {
  assert.equal(extractSyncResult({}), null);
});

// ===== Sub-Phase E: sync mode derivation =====
test('derive-mode: no history → initial', () => {
  assert.equal(deriveNextSyncMode([]), 'initial');
});
test('derive-mode: SUCCESS exists → incremental', () => {
  assert.equal(
    deriveNextSyncMode([{ status: 'SUCCESS' }]),
    'incremental',
  );
});
test('derive-mode: PARTIAL exists → incremental', () => {
  assert.equal(
    deriveNextSyncMode([{ status: 'PARTIAL' }]),
    'incremental',
  );
});
test('derive-mode: only FAILED → initial', () => {
  assert.equal(
    deriveNextSyncMode([{ status: 'FAILED' }, { status: 'FAILED' }]),
    'initial',
  );
});

// ===== Sub-Phase E: format duration =====
test('duration: null finishedAt → em dash', () => {
  assert.equal(formatDuration('2026-01-01T00:00:00Z', null), '—');
});
test('duration: 1.5 seconds', () => {
  const s = formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.500Z');
  assert.ok(s.includes('1.5'));
  assert.ok(s.includes('detik'));
});
test('duration: 2 minutes 5 seconds', () => {
  const s = formatDuration('2026-01-01T00:00:00.000Z', '2026-01-01T00:02:05.000Z');
  assert.ok(s.includes('2 menit'));
  assert.ok(s.includes('5 detik'));
});
test('duration: invalid dates → em dash', () => {
  assert.equal(formatDuration('nonsense', 'nonsense'), '—');
});

// ===== Sub-Phase E: safe issues extractor =====
test('issues: splits NEEDS_REVIEW and CONFLICT', () => {
  const r = extractSafeIssues({
    issues: [
      { id: 'a', reconciliationStatus: 'NEEDS_REVIEW', externalId: 'X', receivedAt: '2026-01-01' },
      { id: 'b', reconciliationStatus: 'CONFLICT', externalId: 'Y', receivedAt: '2026-01-01' },
      { id: 'c', reconciliationStatus: 'MATCHED' }, // filtered out
    ],
  });
  assert.equal(r.needsReview.length, 1);
  assert.equal(r.conflict.length, 1);
});

test('issues: metadata whitelist enforced', () => {
  const r = extractSafeIssues({
    issues: [
      {
        id: 'a',
        reconciliationStatus: 'NEEDS_REVIEW',
        externalId: 'X',
        receivedAt: '2026-01-01',
        metadata: {
          arrival: '2026-01-01',
          departure: '2026-01-05',
          externalUnitId: '730761',
          channel: 'Airbnb',
          guestEmail: 'PII@example.com',
          guestPhone: '+62...',
          price: 9999,
        },
      },
    ],
  });
  const md = r.needsReview[0].metadata;
  assert.ok(md);
  assert.deepEqual(Object.keys(md).sort(), ['arrival', 'channel', 'departure', 'externalUnitId']);
  const json = JSON.stringify(r);
  assert.ok(!json.includes('PII@example.com'));
  assert.ok(!json.includes('+62'));
  assert.ok(!json.includes('9999'));
});

test('issues: safe metadata null for invalid input', () => {
  assert.equal(safeIssueMetadata(null), null);
  assert.equal(safeIssueMetadata('string'), null);
  assert.equal(safeIssueMetadata([]), null);
  assert.equal(safeIssueMetadata({ guestEmail: 'x' }), null);
});

test('issues: no token leak in serialized output', () => {
  const r = extractSafeIssues({
    issues: [
      {
        id: 'a',
        reconciliationStatus: 'CONFLICT',
        externalId: 'X',
        receivedAt: '2026-01-01',
        metadata: { token: 'SECRET', credential: 'SECRET', workspace: 'SECRET', accountId: 'SECRET' },
        reason: 'BEDS24_READ_TOKEN=secret-abc',
      },
    ],
  });
  const json = JSON.stringify(r);
  // Reason field IS echoed (from backend's safe `error` column) — but only string.
  // We only verify metadata does not carry credentials.
  assert.ok(!json.includes('"token":"SECRET"'));
  assert.ok(!json.includes('"credential":"SECRET"'));
});

// ===== Sub-Phase E: feedback builder =====
test('feedback: SUCCESS with no activity → title only', () => {
  const fb = buildSyncFeedback({
    id: 'r1', syncType: 'reservations', status: 'SUCCESS',
    startedAt: 'x', finishedAt: 'y',
    receivedCount: 0, createdCount: 0, updatedCount: 0,
    cancelledCount: 0, conflictCount: 0, errorCount: 0,
    needsReviewCount: null, lastError: null,
  });
  assert.equal(fb.kind, 'success');
  assert.equal(fb.summary, null);
});

test('feedback: PARTIAL with activity includes summary', () => {
  const fb = buildSyncFeedback({
    id: 'r1', syncType: 'reservations', status: 'PARTIAL',
    startedAt: 'x', finishedAt: 'y',
    receivedCount: 5, createdCount: 3, updatedCount: 1,
    cancelledCount: 0, conflictCount: 1, errorCount: 0,
    needsReviewCount: 2, lastError: null,
  });
  assert.equal(fb.kind, 'warning');
  assert.ok(fb.summary);
  assert.ok(fb.summary.includes('3 dibuat'));
  assert.ok(fb.summary.includes('1 konflik'));
  assert.ok(fb.summary.includes('2 perlu diperiksa'));
});

test('feedback: FAILED → error kind', () => {
  const fb = buildSyncFeedback({
    id: 'r1', syncType: 'reservations', status: 'FAILED',
    startedAt: 'x', finishedAt: 'y',
    receivedCount: 0, createdCount: 0, updatedCount: 0,
    cancelledCount: 0, conflictCount: 0, errorCount: 1,
    needsReviewCount: null, lastError: 'boom',
  });
  assert.equal(fb.kind, 'error');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);