import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError, duplicateKeyError, isDuplicateKeyError } from '../lib/AppError';
import { logger } from '../lib/logger';
import { isProd } from '../config/env';

export const notFound: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (isDuplicateKeyError(error)) {
    appError = duplicateKeyError(error, {
      phoneNumber: 'Phone number',
      email: 'Email',
      storeSlug: 'Store link',
      gstin: 'GSTIN',
      slug: 'Slug',
      sku: 'SKU',
      'variants.sku': 'Variant SKU',
      idempotencyKey: 'Request',
      orderNumber: 'Order number',
    });
  } else if (error instanceof mongoose.Error.CastError) {
    // Malformed ObjectId in a path/query parameter is a client mistake, not a server fault.
    logger.warn('cast_error_debug', { path: error.path, value: error.value, message: error.message });
    appError = AppError.badRequest('That identifier is not valid.');
  } else if (error instanceof mongoose.Error.ValidationError) {
    appError = AppError.validation(
      'One or more fields are invalid.',
      Object.values(error.errors).map((issue) => ({ path: issue.path, message: issue.message })),
    );
  } else if (error instanceof ZodError) {
    appError = AppError.validation(
      'Request validation failed.',
      error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  } else {
    appError = AppError.internal();
  }

  if (appError.statusCode >= 500) {
    logger.error('unhandled_error', {
      requestId: req.requestId,
      route: req.originalUrl.split('?')[0],
      message: error instanceof Error ? error.message : String(error),
      stack: isProd ? undefined : error instanceof Error ? error.stack : undefined,
    });
  } else {
    logger.warn('request_rejected', {
      requestId: req.requestId,
      route: req.originalUrl.split('?')[0],
      code: appError.code,
      status: appError.statusCode,
    });
  }

  res.status(appError.statusCode).json({
    success: false,
    data: null,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};
