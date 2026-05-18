import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      field_errors: err.flatten().fieldErrors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { field_errors: err.fieldErrors } : {}),
    });
  }

  console.error(err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
