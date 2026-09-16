import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { AuthUser } from './types.ts';

export type VerifyConfig = {
  issuer: string;
  audience: string;
};

export type AccessJwtPayload = Record<string, unknown>;

/**
 * Cryptographically verify a Cloudflare Access JWT.
 *
 * Returns the verified payload on success, or null on ANY failure
 * (invalid signature, wrong issuer, wrong audience, expired, malformed).
 *
 * FAIL CLOSED: all errors return null, never throw.
 */
export async function verifyCfAccessJwt(
  jwt: string,
  config: VerifyConfig,
  getKey: JWTVerifyGetKey,
): Promise<AccessJwtPayload | null> {
  if (!jwt || typeof jwt !== 'string') return null;
  try {
    const { payload } = await jwtVerify(jwt, getKey, {
      issuer: config.issuer,
      audience: config.audience,
    });
    return payload as AccessJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract a provider-neutral AuthUser from a verified Cloudflare Access payload.
 * Returns null if required claims (sub, email) are missing.
 */
export function payloadToAuthUser(payload: AccessJwtPayload): AuthUser | null {
  const id =
    typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  const email =
    typeof payload.email === 'string' && payload.email.length > 0
      ? payload.email
      : null;
  if (!id || !email) return null;

  const displayName =
    typeof payload.name === 'string' && payload.name.length > 0
      ? payload.name
      : email;

  return { id, email, displayName };
}