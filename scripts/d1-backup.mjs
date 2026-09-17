#!/usr/bin/env node
/**
 * PR-D production D1 backup helper.
 *
 * Exports the production D1 database to a timestamped SQL file under backups/.
 * Backup files are gitignored — never committed.
 *
 * Usage:
 *   npm run d1:backup:prod
 */

import { execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DB_NAME = 'arsavaya-pms-prod';
const CONFIG = 'wrangler.prod.jsonc';
const BACKUP_DIR = resolve(ROOT, 'backups');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    '-',
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join('');
}

if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Created directory: backups/`);
}

const filename = `prod-${timestamp()}.sql`;
const outputPath = resolve(BACKUP_DIR, filename);

console.log(`Exporting ${DB_NAME} → backups/${filename}`);
console.log('');

try {
  execSync(
    `npx wrangler d1 export ${DB_NAME} --remote --config ${CONFIG} --output "${outputPath}"`,
    { cwd: ROOT, stdio: 'inherit' },
  );
  console.log('');
  console.log(`\u2705 Backup complete: backups/${filename}`);
} catch (e) {
  console.error('');
  console.error(`\u274c Backup failed: ${e.message}`);
  process.exit(1);
}