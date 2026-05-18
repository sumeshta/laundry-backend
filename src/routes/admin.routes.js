import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  hubCreateSchema,
  hubUpdateSchema,
  categorySchema,
  categoryUpdateSchema,
  productSchema,
  productUpdateSchema,
  statusSchema,
} from '../validators/schemas.js';
import * as hubService from '../services/hub.service.js';
import * as catalogService from '../services/catalog.service.js';
import * as orderService from '../services/order.service.js';
import * as settingsService from '../services/settings.service.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();

router.use(authenticate, requireRoles('admin', 'hub_manager'));

// Platform settings
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await settingsService.getPlatformSettings();
    res.json(settings);
  })
);

router.patch(
  '/settings',
  validate(
    z.object({
      body: z.object({
        currency: z.string().min(3).max(3),
      }),
    })
  ),
  asyncHandler(async (req, res) => {
    const result = await settingsService.updateCurrency(req.body.currency.toUpperCase());
    res.json(result);
  })
);

// Hubs
router.get(
  '/hubs',
  asyncHandler(async (req, res) => {
    const hubs = await hubService.listHubs(false);
    res.json({ data: hubs });
  })
);

router.post(
  '/hubs',
  validate(hubCreateSchema),
  asyncHandler(async (req, res) => {
    const hub = await hubService.createHub(req.body);
    res.status(201).json(hub);
  })
);

router.patch(
  '/hubs/:id',
  validate(hubUpdateSchema),
  asyncHandler(async (req, res) => {
    const hub = await hubService.updateHub(req.params.id, req.body);
    res.json(hub);
  })
);

router.delete(
  '/hubs/:id',
  asyncHandler(async (req, res) => {
    const result = await hubService.deleteHub(req.params.id);
    res.json(result);
  })
);

// Catalog
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await catalogService.listCategories(false);
    res.json({ data: categories });
  })
);

router.post(
  '/categories',
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const cat = await catalogService.createCategory(req.body);
    res.status(201).json(cat);
  })
);

router.patch(
  '/categories/:id',
  validate(categoryUpdateSchema),
  asyncHandler(async (req, res) => {
    const cat = await catalogService.updateCategory(req.params.id, req.body);
    res.json(cat);
  })
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const result = await catalogService.deleteCategory(req.params.id);
    res.json(result);
  })
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.activeOnly !== 'false';
    const products = await catalogService.listProducts({
      categoryId: req.query.categoryId,
      activeOnly,
    });
    res.json({ data: products });
  })
);

router.post(
  '/products',
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const product = await catalogService.createProduct(req.body);
    res.status(201).json(product);
  })
);

router.patch(
  '/products/:id',
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const product = await catalogService.updateProduct(req.params.id, req.body);
    res.json(product);
  })
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const result = await catalogService.deleteProduct(req.params.id);
    res.json(result);
  })
);

// Orders
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const result = await orderService.adminListOrders({
      hubId: req.query.hubId,
      status: req.query.status,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  })
);

router.patch(
  '/orders/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body.status,
      req.body.notes
    );
    res.json(order);
  })
);

router.get(
  '/reports/summary',
  asyncHandler(async (req, res) => {
    const summary = await orderService.getReportsSummary();
    res.json(summary);
  })
);

// Staff
router.get(
  '/staff',
  asyncHandler(async (req, res) => {
    const staff = await prisma.staffProfile.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        hub: { select: { id: true, name: true, code: true } },
      },
    });
    res.json({ data: staff });
  })
);

router.post(
  '/staff',
  validate(
    z.object({
      body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        fullName: z.string().min(2),
        phone: z.string().optional(),
        hubId: z.string(),
        staffRole: z.enum(['pickup', 'delivery', 'hub_operator', 'manager']),
      }),
    })
  ),
  asyncHandler(async (req, res) => {
    const { email, password, fullName, phone, hubId, staffRole } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          phone,
          role: 'staff',
          staffProfile: {
            create: { hubId, staffRole },
          },
        },
        include: { staffProfile: { include: { hub: true } } },
      });
      return created;
    });

    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  })
);

export default router;
