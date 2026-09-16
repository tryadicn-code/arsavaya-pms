import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

let cached: JWTVerifyGetKey | null = null;
let cachedTeamDomain: string | null = null;

/**
 * Return a cached Cloudflare Access JWKS resolver for the given team domain.
 * jose's createRemoteJWKSet maintains its own internal key cache, so this
 * singleton avoids creating a new fetcher on every request.
 *
 * No global user/session state — this only caches the JWKS lookup object.
 */
export function getJwksForTeamDomain(teamDomain: string): JWTVerifyGetKey {
  if (cached && cachedTeamDomain === teamDomain) return cached;
  cached = createRemoteJWKSet(
    new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
  );
  cachedTeamDomain = teamDomain;
  return cached;
}