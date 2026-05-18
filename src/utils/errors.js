export class AppError extends Error {
  constructor(status, code, message, fieldErrors = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function notFound(message = 'Resource not found') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function badRequest(message, fieldErrors = null) {
  return new AppError(400, 'BAD_REQUEST', message, fieldErrors);
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden') {
  return new AppError(403, 'FORBIDDEN', message);
}

export function conflict(message) {
  return new AppError(409, 'CONFLICT', message);
}
