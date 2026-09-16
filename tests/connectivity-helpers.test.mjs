import assert from 'node:assert/strict';

import {
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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);