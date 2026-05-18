import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { orderDraftSchema, lineItemsSchema } from '../validators/schemas.js';
import * as orderService from '../services/order.service.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await orderService.listOrders(req.user.id, {
      status: req.query.status,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  })
);

router.post(
  '/draft',
  asyncHandler(async (req, res) => {
    const order = await orderService.createDraft(req.user.id);
    res.status(201).json(order);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.id, req.user.id, req.user.role);
    res.json(order);
  })
);

router.patch(
  '/:id',
  validate(orderDraftSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.updateDraft(req.params.id, req.user.id, req.body);
    res.json(order);
  })
);

router.put(
  '/:id/line-items',
  validate(lineItemsSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.setLineItems(req.params.id, req.user.id, req.body.items);
    res.json(order);
  })
);

router.post(
  '/:id/estimate',
  asyncHandler(async (req, res) => {
    const order = await orderService.computeEstimate(req.params.id, req.user.id);
    res.json(order);
  })
);

router.post(
  '/:id/confirm',
  asyncHandler(async (req, res) => {
    const order = await orderService.confirmOrder(req.params.id, req.user.id);
    res.json(order);
  })
);

router.post(
  '/:id/cancel',
  validate(
    z.object({
      body: z.object({ reason: z.string().optional() }),
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.params.id, req.user.id, req.body.reason);
    res.json(order);
  })
);

export default router;
