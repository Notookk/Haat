import type { AuthPayload, MePayload, PaginationMeta } from './types';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

interface Envelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string; details: unknown[] } | null;
  meta?: PaginationMeta;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Array<{ path?: string; message?: string }>;

  constructor(status: number, code: string, message: string, details: Array<{ path?: string; message?: string }> = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta;
}

/** Access token lives in memory only — the HttpOnly refresh cookie rehydrates it on reload. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let refreshInFlight: Promise<AuthPayload | null> | null = null;

/** Single-flight refresh: concurrent 401s share one rotation instead of racing the cookie. */
export function refreshAccessToken(): Promise<AuthPayload | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!response.ok) {
          accessToken = null;
          return null;
        }
        const body = (await response.json()) as Envelope<AuthPayload>;
        accessToken = body.data.accessToken;
        return body.data;
      } catch {
        accessToken = null;
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Set for the auth calls themselves so a 401 never triggers a recursive refresh. */
  skipRefresh?: boolean;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.method && options.method !== 'GET') headers['X-Requested-With'] = 'XMLHttpRequest';

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
    signal: options.signal,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  let response = await send(path, options);

  if (response.status === 401 && !options.skipRefresh && getAccessToken() !== null) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await send(path, options);
  }

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || !payload || payload.success === false) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'NETWORK_ERROR',
      error?.message ?? 'The server did not respond. Check your connection and try again.',
      (error?.details as Array<{ path?: string; message?: string }> | undefined) ?? [],
    );
  }

  return { data: payload.data, meta: payload.meta };
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body: unknown, skipRefresh = false) => apiRequest<T>(path, { method: 'POST', body, skipRefresh }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

/** Auth calls that must not recurse through the refresh interceptor. */
export async function loginRequest(identifier: string, password: string): Promise<AuthPayload> {
  const result = await api.post<AuthPayload>('/auth/login', { identifier, password }, true);
  accessToken = result.data.accessToken;
  return result.data;
}

export async function registerRequest(input: {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
  role: 'BUYER' | 'SELLER';
}): Promise<AuthPayload> {
  const result = await api.post<AuthPayload>('/auth/register', input, true);
  accessToken = result.data.accessToken;
  return result.data;
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post<{ loggedOut: boolean }>('/auth/logout', {}, true);
  } finally {
    accessToken = null;
  }
}

export async function fetchMe(): Promise<MePayload> {
  const result = await api.get<MePayload>('/auth/me');
  return result.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Try again.';
}
