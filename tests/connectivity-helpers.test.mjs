import assert from 'node:assert/strict';

import {
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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);