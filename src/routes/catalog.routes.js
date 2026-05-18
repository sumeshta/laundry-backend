import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as catalogService from '../services/catalog.service.js';

const router = Router();

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await catalogService.listCategories(true);
    res.json({ data: categories });
  })
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const products = await catalogService.listProducts({
      categoryId: req.query.categoryId,
      activeOnly: true,
    });
    res.json({ data: products });
  })
);

export default router;
