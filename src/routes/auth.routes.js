import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema, refreshSchema } from '../validators/schemas.js';
import * as authService from '../services/auth.service.js';
import { z } from 'zod';

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerCustomer(req.body);
    res.status(201).json(result);
  })
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  })
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refreshAccessToken(req.body.refreshToken);
    res.json(tokens);
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req.body?.refreshToken);
    res.json({ message: 'Logged out' });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    res.json(user);
  })
);

router.patch(
  '/me',
  authenticate,
  validate(
    z.object({
      body: z.object({
        fullName: z.string().min(2).optional(),
        phone: z.string().min(6).optional(),
      }),
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await authService.updateMe(req.user.id, req.body);
    res.json(user);
  })
);

router.post(
  '/change-password',
  authenticate,
  validate(
    z.object({
      body: z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user.id, req.body);
    res.json(result);
  })
);

export default router;
