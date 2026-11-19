/** Standard API envelopes (PRD §14.6). Every endpoint uses exactly these shapes. */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown[];
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Known error codes returned by the API. Extend as modules land. */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  SLOT_OVERBOOKED: 'SLOT_OVERBOOKED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SELLER_ACCOUNT_PENDING: 'SELLER_ACCOUNT_PENDING',
  SELLER_ACCOUNT_BLOCKED: 'SELLER_ACCOUNT_BLOCKED',
  SELLER_ACCOUNT_REJECTED: 'SELLER_ACCOUNT_REJECTED',
  SELLER_STATE_TRANSITION_INVALID: 'SELLER_STATE_TRANSITION_INVALID',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 };
}
