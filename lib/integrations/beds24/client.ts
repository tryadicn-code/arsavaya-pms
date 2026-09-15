/**
 * Beds24 API V2 HTTP client. SERVER ONLY.
 *
 * VERIFIED:
 *   - Base URL: https://api.beds24.com/v2
 *   - Auth header: `token`
 *   - Rate-limit headers: x-five-min-limit-remaining, x-five-min-limit-resets-in, x-request-cost
 *   - Pagination: follow pages.nextPageLink when pages.nextPageExists === true
 */
import { buildAuthHeaders } from './headers.ts';
import {
  translateHttpStatus,
  translateNetworkError,
  translateParseError,
  translateTimeoutError,
} from './errors.ts';
import { IntegrationError, ERROR_CATEGORY } from '../errors.ts';

export const BEDS24_BASE_URL = 'https://api.beds24.com/v2';
const TRUSTED_ORIGIN = 'https://api.beds24.com';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export type RateLimitInfo = {
  remaining: number | null;
  resetsIn: number | null;
  requestCost: number | null;
};

export type ClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  onRateLimit?: (info: RateLimitInfo) => void;
};

export type RequestOptions = {
  method?: 'GET' | 'POST';
  path: string;
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  token?: string;
  timeoutMs?: number;
};

export class Beds24Client {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly onRateLimit?: (info: RateLimitInfo) => void;
  lastRateLimit: RateLimitInfo = { remaining: null, resetsIn: null, requestCost: null };

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? BEDS24_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onRateLimit = opts.onRateLimit;
  }

  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const token = opts.token;
    if (!token) {
      throw new IntegrationError(
        ERROR_CATEGORY.authentication,
        'Beds24 token required for request.',
        { provider: 'beds24' },
      );
    }
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = { ...buildAuthHeaders(token) };
    if (opts.body !== undefined) headers['content-type'] = 'application/json';

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await this.doFetch(url, headers, opts);
        this.captureRateLimit(res);
        if (res.ok) {
          if (res.status === 204) return undefined as T;
          try {
            return (await res.json()) as T;
          } catch (e) {
            throw translateParseError(e instanceof Error ? e.message : undefined);
          }
        }
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
          await this.backoff(attempt, res.headers.get('retry-after'));
          continue;
        }
        let body: unknown = undefined;
        try {
          body = await res.json();
        } catch {
          /* ignore */
        }
        throw translateHttpStatus(res.status, body);
      } catch (e) {
        if (e instanceof IntegrationError) {
          if (
            e.category === ERROR_CATEGORY.authentication ||
            e.category === ERROR_CATEGORY.invalidResponse ||
            e.category === ERROR_CATEGORY.unsupportedOperation
          ) {
            throw e;
          }
          lastError = e;
          if (attempt < MAX_RETRIES) {
            await this.backoff(attempt);
            continue;
          }
          throw e;
        }
        lastError = e;
        if (attempt < MAX_RETRIES) {
          await this.backoff(attempt);
          continue;
        }
        throw translateNetworkError(e);
      }
    }
    throw lastError instanceof IntegrationError
      ? lastError
      : translateNetworkError(lastError);
  }

  /**
   * Follow pagination via nextPageLink until exhausted.
   * Only follows trusted Beds24 origin.
   */
  async requestAllPages<T = unknown>(
    firstPath: string,
    firstQuery: Record<string, string | number | undefined | null>,
    extractItems: (body: unknown) => T[],
    token: string,
  ): Promise<T[]> {
    const items: T[] = [];
    let path: string | null = firstPath;
    let query: Record<string, string | number | undefined | null> | undefined = firstQuery;
    let pageCount = 0;
    const MAX_PAGES = 200;

    while (path !== null && pageCount < MAX_PAGES) {
      const body: unknown = await this.request({ path, query, token });
      items.push(...extractItems(body));

      const wrapper = body as {
        pages?: { nextPageExists?: boolean; nextPageLink?: string };
      };
      const next = wrapper?.pages?.nextPageLink;
      const hasNext = wrapper?.pages?.nextPageExists === true;

      if (!hasNext || !next) {
        path = null;
        break;
      }
      const parsed = this.parseTrustedLink(next);
      if (!parsed) {
        path = null;
        break;
      }
      path = parsed.path;
      query = parsed.query;
      pageCount++;
    }
    return items;
  }

  parseTrustedLink(link: string): { path: string; query: Record<string, string> } | null {
    let u: URL;
    try {
      u = new URL(link);
    } catch {
      return null;
    }
    if (u.origin !== TRUSTED_ORIGIN) return null;
    const path = u.pathname.replace(/^\/v2/, '');
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    return { path, query };
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | undefined | null>,
  ): string {
    const clean = path.startsWith('/') ? path : '/' + path;
    const u = new URL(this.baseUrl + clean);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === '') continue;
        u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private async doFetch(
    url: string,
    headers: Record<string, string>,
    opts: RequestOptions,
  ): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
        redirect: 'error',
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw translateTimeoutError();
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  private captureRateLimit(res: Response): void {
    const info: RateLimitInfo = {
      remaining: numOrNull(res.headers.get('x-five-min-limit-remaining')),
      resetsIn: numOrNull(res.headers.get('x-five-min-limit-resets-in')),
      requestCost: numOrNull(res.headers.get('x-request-cost')),
    };
    this.lastRateLimit = info;
    this.onRateLimit?.(info);
  }

  private async backoff(attempt: number, retryAfter?: string | null): Promise<void> {
    let delay = 250 * Math.pow(2, attempt);
    if (retryAfter) {
      const s = Number(retryAfter);
      if (Number.isFinite(s) && s > 0 && s < 60) delay = s * 1000;
    }
    await new Promise((r) => setTimeout(r, delay));
  }
}

function numOrNull(s: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}