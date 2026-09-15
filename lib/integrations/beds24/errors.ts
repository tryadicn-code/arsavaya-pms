import { ERROR_CATEGORY, IntegrationError } from '../errors.ts';

type Beds24ErrorBody = { error?: string; message?: string; code?: string };

export function parseBeds24Error(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Beds24ErrorBody;
  const parts = [b.error, b.message, b.code].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );
  return parts.length ? parts.join(' Â· ') : undefined;
}

export function translateHttpStatus(
  status: number,
  body: unknown,
  provider = 'beds24',
): IntegrationError {
  const detail = parseBeds24Error(body);
  if (status === 401) {
    return new IntegrationError(ERROR_CATEGORY.authentication, 'Beds24 authentication failed.', { provider, safeDetail: detail });
  }
  if (status === 403) {
    return new IntegrationError(ERROR_CATEGORY.authentication, 'Beds24 token lacks required scope.', { provider, safeDetail: detail });
  }
  if (status === 404) {
    return new IntegrationError(ERROR_CATEGORY.invalidResponse, 'Beds24 resource not found.', { provider, safeDetail: detail });
  }
  if (status === 429) {
    return new IntegrationError(ERROR_CATEGORY.rateLimited, 'Beds24 rate limit reached.', { provider, safeDetail: detail });
  }
  if (status >= 500) {
    return new IntegrationError(ERROR_CATEGORY.providerUnavailable, 'Beds24 server error (' + status + ').', { provider, safeDetail: detail });
  }
  if (status >= 400) {
    return new IntegrationError(ERROR_CATEGORY.invalidResponse, 'Beds24 error (' + status + ').', { provider, safeDetail: detail });
  }
  return new IntegrationError(ERROR_CATEGORY.unknown, 'Beds24 unexpected status ' + status + '.', { provider, safeDetail: detail });
}

export function translateNetworkError(err: unknown, provider = 'beds24'): IntegrationError {
  const msg = err instanceof Error ? err.message : 'Network error';
  return new IntegrationError(ERROR_CATEGORY.network, 'Beds24 network error: ' + msg, { provider });
}

export function translateTimeoutError(provider = 'beds24'): IntegrationError {
  return new IntegrationError(ERROR_CATEGORY.network, 'Beds24 request timed out.', { provider });
}

export function translateParseError(detail?: string, provider = 'beds24'): IntegrationError {
  return new IntegrationError(ERROR_CATEGORY.invalidResponse, 'Beds24 returned a malformed response.', { provider, safeDetail: detail });
}

export function translateValidationError(detail: string, provider = 'beds24'): IntegrationError {
  return new IntegrationError(ERROR_CATEGORY.invalidResponse, 'Beds24 response failed schema validation.', { provider, safeDetail: detail });
}