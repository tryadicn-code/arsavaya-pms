/**
 * Provider-neutral error categories. Provider adapters translate
 * their native error shapes into these categories so that the core
 * integration layer never depends on provider-specific error codes.
 */
export const ERROR_CATEGORY = {
  authentication: 'AUTHENTICATION_ERROR',
  rateLimited: 'RATE_LIMITED',
  network: 'NETWORK_ERROR',
  invalidResponse: 'INVALID_RESPONSE',
  mapping: 'MAPPING_ERROR',
  conflict: 'CONFLICT',
  providerUnavailable: 'PROVIDER_UNAVAILABLE',
  unsupportedOperation: 'UNSUPPORTED_OPERATION',
  unknown: 'UNKNOWN_ERROR',
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

export type IntegrationErrorOptions = {
  provider?: string;
  safeDetail?: string;
  cause?: unknown;
};

export class IntegrationError extends Error {
  readonly category: ErrorCategory;
  readonly provider?: string;
  readonly safeDetail?: string;

  constructor(category: ErrorCategory, message: string, opts: IntegrationErrorOptions = {}) {
    super(message);
    this.name = 'IntegrationError';
    this.category = category;
    this.provider = opts.provider;
    this.safeDetail = opts.safeDetail;
    if (opts.cause !== undefined) {
      (this as { cause?: unknown }).cause = opts.cause;
    }
  }
}

export function isIntegrationError(e: unknown): e is IntegrationError {
  return e instanceof IntegrationError;
}

export function normalizeError(err: unknown, provider?: string): IntegrationError {
  if (isIntegrationError(err)) return err;
  if (err instanceof Error) {
    return new IntegrationError(ERROR_CATEGORY.unknown, err.message || 'Provider error', {
      provider,
    });
  }
  return new IntegrationError(ERROR_CATEGORY.unknown, 'Unknown provider error', { provider });
}