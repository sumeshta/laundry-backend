import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { addressSchema, addressUpdateSchema } from '../validators/schemas.js';
import * as addressService from '../services/address.service.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const addresses = await addressService.listAddresses(req.user.id);
    res.json({ data: addresses });
  })
);

router.post(
  '/',
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const address = await addressService.createAddress(req.user.id, req.body);
    res.status(201).json(address);
  })
);

router.patch(
  '/:id',
  validate(addressUpdateSchema),
  asyncHandler(async (req, res) => {
    const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
    res.json(address);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await addressService.deleteAddress(req.user.id, req.params.id);
    res.status(204).send();
  })
);

export default router;
