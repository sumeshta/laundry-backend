import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { hubResolveSchema } from '../validators/schemas.js';
import * as hubService from '../services/hub.service.js';

const router = Router();

router.post(
  '/resolve-nearest',
  authenticate,
  validate(hubResolveSchema),
  asyncHandler(async (req, res) => {
    const result = await hubService.resolveNearestHub(req.body.latitude, req.body.longitude);
    res.json(result);
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const hubs = await hubService.listHubs(req.query.active !== 'false');
    res.json({ data: hubs });
  })
);

export default router;
