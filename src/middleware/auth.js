import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing or invalid authorization header'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    /* ignore */
  }
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Insufficient permissions'));
    }
    next();
  };
}
