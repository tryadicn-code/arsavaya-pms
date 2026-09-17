/**
 * Beds24 authentication — least privilege, read-only.
 *
 * SERVER ONLY. This file imports `cloudflare:workers`, so it must NOT
 * be imported by modules that are loaded in Node.js tests.
 *
 * The pure header-building function lives in ./headers.ts.
 */
import { env } from 'cloudflare:workers';
import { ERROR_CATEGORY, IntegrationError } from '../errors.ts';

const ENV_KEY = 'BEDS24_READ_TOKEN' as const;

export function readTokenFromEnv(): string {
  const raw = env[ENV_KEY];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new IntegrationError(
      ERROR_CATEGORY.authentication,
      'Beds24 read token is not configured. Set the Cloudflare secret binding BEDS24_READ_TOKEN.',
      { provider: 'beds24' },
    );
  }
  return raw.trim();
}

export function isConfigured(): boolean {
  const raw = env[ENV_KEY];
  return typeof raw === 'string' && raw.trim().length > 0;
}