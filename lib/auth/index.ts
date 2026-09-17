import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import type { ApplicationContext, Environment } from './types.ts';
import { liveWorkspaceId } from './workspace.ts';
import { parseDevHeaders } from './dev-provider.ts';
import { verifyCfAccessJwt, payloadToAuthUser } from './cf-access-provider.ts';
import { getJwksForTeamDomain } from './jwks.ts';

/**
 * Resolve the runtime environment.
 * FAIL CLOSED: anything that is not exactly "development" is treated as production.
 */
function readEnvironment(): Environment {
  const raw = env.ENVIRONMENT;
  return raw === 'development' ? 'development' : 'production';
}

/**
 * Resolve the current application context (provider-neutral).
 *
 * - Development: parses ChatGPT/Sites `oai-authenticated-user-*` headers.
 * - Production: verifies Cloudflare Access JWT cryptographically.
 *
 * Returns null if authentication fails (caller must return 401).
 *
 * Never falls back to development auth in production.
 */
export async function getApplicationContext(): Promise<ApplicationContext | null> {
  const environment = readEnvironment();
  const requestHeaders = await headers();

  if (environment === 'production') {
    const jwt = requestHeaders.get('Cf-Access-Jwt-Assertion');
    if (!jwt) return null;

    const envRecord = env;
    const teamDomain = envRecord.CF_ACCESS_TEAM_DOMAIN;
    const audience = envRecord.CF_ACCESS_APP_AUD;
    if (typeof teamDomain !== 'string' || teamDomain.length === 0) return null;
    if (typeof audience !== 'string' || audience.length === 0) return null;

    const payload = await verifyCfAccessJwt(
      jwt,
      { issuer: `https://${teamDomain}`, audience },
      getJwksForTeamDomain(teamDomain),
    );
    if (!payload) return null;

    const user = payloadToAuthUser(payload);
    if (!user) return null;

    return {
      user,
      environment,
      workspaceId: liveWorkspaceId(environment, user),
    };
  }

  // Development-only branch. Never reached in production.
  const user = parseDevHeaders(requestHeaders);
  if (!user) return null;

  return {
    user,
    environment,
    workspaceId: liveWorkspaceId(environment, user),
  };
}