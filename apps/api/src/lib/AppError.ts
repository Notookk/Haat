import { ERROR_CODES, type ErrorCode } from '@haat/shared';

/**
 * Every thrown domain error is an AppError (PRD §15.4).
 * The global error middleware serialises it into the standard failure envelope.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: unknown[];

  constructor(code: ErrorCode | string, message: string, statusCode = 400, details: unknown[] = []) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, details: unknown[] = []): AppError {
    return new AppError(ERROR_CODES.BAD_REQUEST, message, 400, details);
  }

  static validation(message: string, details: unknown[] = []): AppError {
    return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }

  static unauthorized(message = 'Authentication required.', code: ErrorCode = ERROR_CODES.UNAUTHORIZED): AppError {
    return new AppError(code, message, 401);
  }

  static forbidden(message = 'You do not have access to this resource.'): AppError {
    return new AppError(ERROR_CODES.FORBIDDEN, message, 403);
  }

  static notFound(message = 'Resource not found.'): AppError {
    return new AppError(ERROR_CODES.NOT_FOUND, message, 404);
  }

  static conflict(message: string, code: ErrorCode = ERROR_CODES.CONFLICT): AppError {
    return new AppError(code, message, 409);
  }

  static unavailable(message: string): AppError {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, message, 503);
  }

  static internal(message = 'Something went wrong on our side.'): AppError {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, message, 500);
  }
}

/** True for MongoDB duplicate-key errors (E11000). */
export function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 11000;
}

/** Turns E11000 into a field-specific 409 conflict. */
export function duplicateKeyError(error: unknown, fieldLabels: Record<string, string>): AppError {
  const pattern = isDuplicateKeyError(error) ? (error.keyPattern ?? {}) : {};
  const field = Object.keys(pattern)[0];
  const label = field ? (fieldLabels[field] ?? field) : 'value';
  return AppError.conflict(`${label} is already in use.`, ERROR_CODES.DUPLICATE_KEY);
}
