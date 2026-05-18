import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as settingsService from '../services/settings.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = await settingsService.getPlatformSettings();
    res.json(settings);
  })
);

export default router;
