#!/usr/bin/env node
/**
 * PR-C deploy preflight — validation only. Never deploys.
 *
 * Exits 0 if all checks pass (deploy theoretically possible).
 * Exits 1 if any check fails (deploy must be refused).
 *
 * No production confirmation prompt — that belongs to the future
 * real deploy script (PR-D onward). This is validation only.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = process.cwd();
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
  return raw
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

// 1. Git working tree clean
check('git working tree clean', () => {
  const out = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' });
  if (out.trim().length > 0) {
    return { ok: false, message: 'Working tree has uncommitted changes' };
  }
  return { ok: true, message: 'clean' };
});

// 2. Expected branch
check('expected branch', () => {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: ROOT,
    encoding: 'utf-8',
  }).trim();
  const allowed = ['Production-Readiness', 'main'];
  if (!allowed.includes(branch)) {
    return { ok: false, message: `branch "${branch}" not in ${allowed.join(', ')}` };
  }
  return { ok: true, message: branch };
});

// 3. Build output exists
check('build output exists', () => {
  const main = resolve(ROOT, 'dist/server/index.js');
  const assets = resolve(ROOT, 'dist/client');
  if (!existsSync(main)) return { ok: false, message: `missing ${main}` };
  if (!existsSync(assets)) return { ok: false, message: `missing ${assets}` };
  return { ok: true, message: 'dist/server/index.js + dist/client OK' };
});

// 4. wrangler.prod.jsonc exists + parses
let prodConfig = null;
check('wrangler.prod.jsonc parseable', () => {
  const path = resolve(ROOT, 'wrangler.prod.jsonc');
  if (!existsSync(path)) return { ok: false, message: 'file not found' };
  const raw = readFileSync(path, 'utf-8');
  try {
    prodConfig = JSON.parse(stripJsonComments(raw));
    return { ok: true, message: 'parsed' };
  } catch (e) {
    return { ok: false, message: `JSON parse error: ${e.message}` };
  }
});

// 5. ENVIRONMENT=production
check('ENVIRONMENT=production', () => {
  const val = prodConfig?.vars?.ENVIRONMENT;
  if (val !== 'production') {
    return { ok: false, message: `expected "production", got "${val ?? '(missing)'}"` };
  }
  return { ok: true, message: 'production' };
});

// 6. D1 database_id resolved
check('D1 database_id resolved', () => {
  const db = prodConfig?.d1_databases?.[0];
  if (!db) return { ok: false, message: 'no D1 binding in config' };
  const id = String(db.database_id ?? '');
  const unresolvedPatterns = [
    /^PLACEHOLDER/i,
    /^00000000-0000-4000-8000-000000000000$/i,
    /^fddab829-e81a-47ce-9f33-0f866ac7304b$/i,
    /^11111111-1111-4111-8111-111111111111$/i,
  ];
  for (const p of unresolvedPatterns) {
    if (p.test(id)) {
      return {
        ok: false,
        message: `D1 unresolved — placeholder UUID detected (${id}). Belongs to PR-D.`,
      };
    }
  }
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4.test(id)) {
    return { ok: false, message: `D1 database_id not a valid UUID: ${id}` };
  }
  return { ok: true, message: id };
});

// 7. D1 database_name safe
check('D1 database_name safe', () => {
  const db = prodConfig?.d1_databases?.[0];
  if (!db) return { ok: false, message: 'no D1 binding' };
  const name = String(db.database_name ?? '');
  if (name === 'vila_eight') {
    return { ok: false, message: 'must not use vila_eight' };
  }
  if (name === 'site-creator-d1') {
    return { ok: false, message: 'must not use site-creator-d1' };
  }
  return { ok: true, message: name };
});

// Summary
console.log('');
if (allPass) {
  console.log('\u2705 PREFLIGHT PASS — deploy theoretically possible');
  console.log('   (real deploy remains out of scope for PR-C)');
  process.exit(0);
} else {
  const failed = results.filter((r) => !r.pass);
  console.log(`\u274c PREFLIGHT FAIL — ${failed.length} check(s) failed`);
  console.log('   Deploy would be refused.');
  console.log('   Expected at PR-C: D1 unresolved (arsavaya-pms-prod belongs to PR-D).');
  process.exit(1);
}