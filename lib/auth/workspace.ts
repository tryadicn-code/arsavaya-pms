import type { AuthUser, Environment } from './types.ts';

export const ARSAVAYA_WORKSPACE_ID = 'arsavaya';

export function liveWorkspaceId(
  environment: Environment,
  user: AuthUser,
): string {
  return environment === 'production' ? ARSAVAYA_WORKSPACE_ID : `live:${user.id}`;
}

export function demoWorkspaceId(
  environment: Environment,
  user: AuthUser,
): string | null {
  return environment === 'production' ? null : `demo:${user.id}`;
}

export function isDemoAllowed(environment: Environment): boolean {
  return environment === 'development';
}