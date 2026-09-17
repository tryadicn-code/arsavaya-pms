#!/usr/bin/env node
/**
 * ARSAVAYA PMS — Safe production deploy wrapper.
 *
 * Usage:
 *   npm run deploy:prod              # validation only (no deploy)
 *   npm run deploy:prod -- --deploy  # actual deploy (requires "yes" confirmation)
 *
 * 10 safety checks:
 *   1. Working tree clean
 *   2. Branch = Production-Readiness or main
 *   3. Build output exists
 *   4. wrangler.prod.jsonc parseable
 *   5. workers_dev === false
 *   6. preview_urls === false
 *   7. ENVIRONMENT === 'production'
 *   8. D1 database_id resolved
 *   9. Required secrets present
 *  10. Explicit operator confirmation (only with --deploy)
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const ROOT = process.cwd();
const CONFIG = 'wrangler.prod.jsonc';
const DEPLOY = process.argv.includes('--deploy');
const REQUIRED_SECRETS = [
  'CF_ACCESS_TEAM_DOMAIN',
  'CF_ACCESS_APP_AUD',
  'BEDS24_READ_TOKEN',
];

let allPass = true;
const results = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r.ok) {
      console.log(`\u2705 ${name}: ${r.message}`);
      results.push({ name, pass: true });
    } else {
      console.log(`\u274c ${name}: ${r.message}`);
      results.push({ name, pass: false });
      allPass = false;
    }
  } catch (e) {
    console.log(`\u274c ${name}: ${e.message}`);
    results.push({ name, pass: false });
    allPass = false;
  }
}

function stripJsonComments(raw) {
  return raw.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8' }).trim();
}

// ---- 1. Working tree clean ----
check('working tree clean', () => {
  const out = run('git status --porcelain');
  return out.length === 0
    ? { ok: true, message: 'clean' }
    : { ok: false, message: 'uncommitted changes present' };
});

// ---- 2. Branch ----
check('expected branch', () => {
  const branch = run('git rev-parse --abbrev-ref HEAD');
  const allowed = ['Production-Readiness', 'main'];
  return allowed.includes(branch)
    ? { ok: true, message: branch }
    : { ok: false, message: `branch "${branch}" not allowed` };
});

// ---- 3. Build output ----
check('build output exists', () => {
  const main = resolve(ROOT, 'dist/server/index.js');
  const assets = resolve(ROOT, 'dist/client');
  if (!existsSync(main)) return { ok: false, message: `missing ${main}` };
  if (!existsSync(assets)) return { ok: false, message: `missing ${assets}` };
  return { ok: true, message: 'dist/server + dist/client OK' };
});

// ---- 4. Config parseable ----
let prodConfig = null;
check('wrangler.prod.jsonc parseable', () => {
  const path = resolve(ROOT, CONFIG);
  if (!existsSync(path)) return { ok: false, message: 'file not found' };
  try {
    prodConfig = JSON.parse(stripJsonComments(readFileSync(path, 'utf-8')));
    return { ok: true, message: 'parsed' };
  } catch (e) {
    return { ok: false, message: `parse error: ${e.message}` };
  }
});

// ---- 5. workers_dev === false ----
check('workers_dev === false', () => {
  const v = prodConfig?.workers_dev;
  return v === false
    ? { ok: true, message: 'false' }
    : { ok: false, message: `expected false, got ${v}` };
});

// ---- 6. preview_urls === false ----
check('preview_urls === false', () => {
  const v = prodConfig?.preview_urls;
  return v === false
    ? { ok: true, message: 'false' }
    : { ok: false, message: `expected false, got ${v}` };
});

// ---- 7. ENVIRONMENT ----
check('ENVIRONMENT=production', () => {
  const v = prodConfig?.vars?.ENVIRONMENT;
  return v === 'production'
    ? { ok: true, message: 'production' }
    : { ok: false, message: `expected "production", got "${v}"` };
});

// ---- 8. D1 binding resolved ----
check('D1 binding resolved', () => {
  const db = prodConfig?.d1_databases?.[0];
  if (!db) return { ok: false, message: 'no D1 binding' };
  const id = String(db.database_id ?? '');
  const unresolved = [
    /^PLACEHOLDER/i,
    /^00000000-0000-4000-8000-000000000000$/i,
    /^11111111-1111-4111-8111-111111111111$/i,
    /^fddab829-e81a-47ce-9f33-0f866ac7304b$/i,
  ];
  for (const p of unresolved) {
    if (p.test(id)) return { ok: false, message: `placeholder detected: ${id}` };
  }
  if (db.database_name === 'vila_eight') {
    return { ok: false, message: 'must not use vila_eight' };
  }
  return { ok: true, message: db.database_name };
});

// ---- 9. Required secrets ----
check('required secrets present', () => {
  let out;
  try {
    out = run(`npx wrangler secret list --config ${CONFIG}`);
  } catch (e) {
    return { ok: false, message: 'could not list secrets' };
  }
  const missing = REQUIRED_SECRETS.filter((s) => !out.includes(s));
  return missing.length === 0
    ? { ok: true, message: `all ${REQUIRED_SECRETS.length} present` }
    : { ok: false, message: `missing: ${missing.join(', ')}` };
});

// ---- Summary ----
console.log('');
if (!allPass) {
  console.log('\u274c PREFLIGHT FAIL — deploy refused');
  process.exit(1);
}

console.log('\u2705 ALL CHECKS PASS');
console.log('');

if (!DEPLOY) {
  console.log('Mode: VALIDATION ONLY (no deploy performed)');
  console.log('To perform actual deploy, run:');
  console.log('  npm run deploy:prod -- --deploy');
  process.exit(0);
}

// ---- 10. Operator confirmation ----
const rl = createInterface({ input: stdin, output: stdout });
const answer = await rl.question(
  `About to deploy "${prodConfig.name}" to PRODUCTION. Type "yes" to confirm: `,
);
rl.close();

if (answer.trim().toLowerCase() !== 'yes') {
  console.log('Deploy cancelled by operator.');
  process.exit(0);
}

console.log('');
console.log('Deploying...');
const result = spawnSync(
  'npx',
  ['wrangler', 'deploy', '--config', CONFIG],
  { cwd: ROOT, stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);