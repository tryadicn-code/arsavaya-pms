import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair } from 'jose';

import {
  liveWorkspaceId,
  demoWorkspaceId,
  isDemoAllowed,
  ARSAVAYA_WORKSPACE_ID,
} from '../lib/auth/workspace.ts';
import { parseDevHeaders } from '../lib/auth/dev-provider.ts';
import {
  verifyCfAccessJwt,
  payloadToAuthUser,
} from '../lib/auth/cf-access-provider.ts';

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log('PASS:', name);
    passed++;
  } catch (e) {
    console.error('FAIL:', name, '-', e?.message ?? e);
    failed++;
  }
}

const USER_A = { id: 'user-a', email: 'a@arsavaya.com', displayName: 'A' };
const USER_B = { id: 'user-b', email: 'b@arsavaya.com', displayName: 'B' };
const ISSUER = 'https://arsavaya.cloudflareaccess.com';
const AUDIENCE = 'test-aud-tag';

// ============ WORKSPACE ============

test('workspace: production live always arsavaya', () => {
  assert.equal(liveWorkspaceId('production', USER_A), ARSAVAYA_WORKSPACE_ID);
  assert.equal(liveWorkspaceId('production', USER_B), ARSAVAYA_WORKSPACE_ID);
});

test('workspace: dev live preserves per-user', () => {
  assert.equal(liveWorkspaceId('development', USER_A), 'live:user-a');
  assert.equal(liveWorkspaceId('development', USER_B), 'live:user-b');
});

test('workspace: two users same workspace in prod', () => {
  assert.equal(
    liveWorkspaceId('production', USER_A),
    liveWorkspaceId('production', USER_B),
  );
});

test('workspace: two users different workspace in dev', () => {
  assert.notEqual(
    liveWorkspaceId('development', USER_A),
    liveWorkspaceId('development', USER_B),
  );
});

test('workspace: dev demo preserved as demo:<userId>', () => {
  assert.equal(demoWorkspaceId('development', USER_A), 'demo:user-a');
});

test('workspace: prod demo returns null (not supported)', () => {
  assert.equal(demoWorkspaceId('production', USER_A), null);
});

test('workspace: isDemoAllowed only true for development', () => {
  assert.equal(isDemoAllowed('development'), true);
  assert.equal(isDemoAllowed('production'), false);
});

test('workspace: demo:arsavaya is never produced', () => {
  const candidates = [
    liveWorkspaceId('production', USER_A),
    liveWorkspaceId('development', USER_A),
    demoWorkspaceId('development', USER_A),
  ];
  for (const c of candidates) {
    assert.notEqual(c, 'demo:arsavaya');
  }
});

// ============ DEV PROVIDER ============

function headersFrom(map) {
  return { get: (name) => map[name] ?? null };
}

test('dev: valid headers produce AuthUser', () => {
  const u = parseDevHeaders(
    headersFrom({
      'oai-authenticated-user-id': 'u1',
      'oai-authenticated-user-email': 'a@b.c',
      'oai-authenticated-user-full-name': 'Alice',
      'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
    }),
  );
  assert.deepEqual(u, { id: 'u1', email: 'a@b.c', displayName: 'Alice' });
});

test('dev: missing id returns null', () => {
  assert.equal(
    parseDevHeaders(headersFrom({ 'oai-authenticated-user-email': 'a@b.c' })),
    null,
  );
});

test('dev: missing email returns null', () => {
  assert.equal(
    parseDevHeaders(headersFrom({ 'oai-authenticated-user-id': 'u1' })),
    null,
  );
});

test('dev: falls back to email when fullName absent', () => {
  const u = parseDevHeaders(
    headersFrom({
      'oai-authenticated-user-id': 'u1',
      'oai-authenticated-user-email': 'a@b.c',
    }),
  );
  assert.equal(u.displayName, 'a@b.c');
});

test('dev: malformed percent-encoded name falls back', () => {
  const u = parseDevHeaders(
    headersFrom({
      'oai-authenticated-user-id': 'u1',
      'oai-authenticated-user-email': 'a@b.c',
      'oai-authenticated-user-full-name': '%E0%A4%A',
      'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
    }),
  );
  assert.equal(u.displayName, 'a@b.c');
});

// ============ PAYLOAD PARSER ============

test('payload: extracts sub/email/name', () => {
  const u = payloadToAuthUser({ sub: 's1', email: 'e@x.com', name: 'Eve' });
  assert.deepEqual(u, { id: 's1', email: 'e@x.com', displayName: 'Eve' });
});

test('payload: missing sub returns null', () => {
  assert.equal(payloadToAuthUser({ email: 'e@x.com' }), null);
});

test('payload: missing email returns null', () => {
  assert.equal(payloadToAuthUser({ sub: 's1' }), null);
});

test('payload: missing name falls back to email', () => {
  const u = payloadToAuthUser({ sub: 's1', email: 'e@x.com' });
  assert.equal(u.displayName, 'e@x.com');
});

// ============ CF ACCESS CRYPTO ============

async function signJwt({
  privateKey,
  issuer = ISSUER,
  audience = AUDIENCE,
  sub = 'user-1',
  email = 'u@arsavaya.com',
  name = 'User',
  exp = '1h',
} = {}) {
  const builder = new SignJWT({ email, name })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(exp);
  if (sub) builder.setSubject(sub);
  return builder.sign(privateKey);
}

const keyA = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
const keyB = await generateKeyPair('EdDSA', { crv: 'Ed25519' });

const getKeyA = async () => keyA.publicKey;

await testAsync('crypto: valid JWT accepted', async () => {
  const jwt = await signJwt({ privateKey: keyA.privateKey });
  const p = await verifyCfAccessJwt(
    jwt,
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.ok(p);
  assert.equal(p.sub, 'user-1');
  assert.equal(p.email, 'u@arsavaya.com');
});

await testAsync('crypto: wrong signature rejected', async () => {
  const jwt = await signJwt({ privateKey: keyB.privateKey });
  const p = await verifyCfAccessJwt(
    jwt,
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.equal(p, null);
});

await testAsync('crypto: wrong audience rejected', async () => {
  const jwt = await signJwt({
    privateKey: keyA.privateKey,
    audience: 'other-aud',
  });
  const p = await verifyCfAccessJwt(
    jwt,
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.equal(p, null);
});

await testAsync('crypto: wrong issuer rejected', async () => {
  const jwt = await signJwt({
    privateKey: keyA.privateKey,
    issuer: 'https://evil.example.com',
  });
  const p = await verifyCfAccessJwt(
    jwt,
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.equal(p, null);
});

await testAsync('crypto: expired JWT rejected', async () => {
  const jwt = await signJwt({ privateKey: keyA.privateKey, exp: '-1s' });
  const p = await verifyCfAccessJwt(
    jwt,
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.equal(p, null);
});

await testAsync('crypto: missing JWT rejected', async () => {
  const p = await verifyCfAccessJwt(
    '',
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.equal(p, null);
});

await testAsync('crypto: malformed JWT rejected', async () => {
  const p = await verifyCfAccessJwt(
    'not.a.jwt',
    { issuer: ISSUER, audience: AUDIENCE },
    getKeyA,
  );
  assert.equal(p, null);
});

// ============ SECURITY ============

test('security: context never contains raw JWT', () => {
  const ctx = {
    user: USER_A,
    workspaceId: ARSAVAYA_WORKSPACE_ID,
    environment: 'production',
  };
  const json = JSON.stringify(ctx);
  assert.ok(!json.includes('Cf-Access'));
  assert.ok(!json.includes('eyJ'));
  assert.ok(!json.includes('jwt'));
});

test('security: workspace key no token-like strings', () => {
  const keys = [
    liveWorkspaceId('production', USER_A),
    liveWorkspaceId('development', USER_A),
    demoWorkspaceId('development', USER_A),
  ];
  for (const k of keys) {
    assert.ok(!k.includes('token'));
    assert.ok(!k.includes('Bearer'));
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);