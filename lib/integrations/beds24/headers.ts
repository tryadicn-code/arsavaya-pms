import { ERROR_CATEGORY, IntegrationError } from '../errors.ts';

export function buildAuthHeaders(token: string): Record<string, string> {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new IntegrationError(
      ERROR_CATEGORY.authentication,
      'Beds24 token required.',
      { provider: 'beds24' },
    );
  }
  return {
    token: token.trim(),
    accept: 'application/json',
  };
}