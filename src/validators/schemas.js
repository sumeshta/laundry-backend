import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    phone: z.string().optional(),
    address: z
      .object({
        line1: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const addressBody = {
  label: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  instructions: z.string().optional(),
  isDefault: z.boolean().optional(),
};

export const addressSchema = z.object({
  body: z.object(addressBody),
});

export const addressUpdateSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    line1: z.string().min(1).optional(),
    line2: z.string().optional(),
    city: z.string().min(1).optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    instructions: z.string().optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const hubResolveSchema = z.object({
  body: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export const orderDraftSchema = z.object({
  body: z.object({
    pickupLine1: z.string().nullish(),
    pickupCity: z.string().nullish(),
    pickupPostal: z.string().nullish(),
    pickupLatitude: z.number().nullish(),
    pickupLongitude: z.number().nullish(),
    pickupInstructions: z.string().nullish(),
    deliveryDate: z.string().nullish(),
    pickupWindow: z.string().nullish(),
    notes: z.string().nullish(),
    lineItems: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().positive().optional(),
          notes: z.string().optional(),
        })
      )
      .optional(),
  }),
});

export const lineItemsSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive().optional(),
        notes: z.string().optional(),
      })
    ),
  }),
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum([
      'draft',
      'pending_confirmation',
      'confirmed',
      'pickup_assigned',
      'pickup_in_progress',
      'picked_up',
      'verification_pending',
      'in_processing',
      'ready_for_delivery',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'exception',
    ]),
    notes: z.string().optional(),
  }),
});

export const hubCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    line1: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const hubUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    line1: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    postalCode: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    radiusKm: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const categorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const categoryUpdateSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' }),
});

export const productSchema = z.object({
  body: z.object({
    categoryId: z.string(),
    name: z.string().min(1),
    slug: z.string().min(1),
    unit: z.string().optional(),
    basePrice: z.number().positive(),
    isActive: z.boolean().optional(),
  }),
});

export const productUpdateSchema = z.object({
  body: z
    .object({
      categoryId: z.string().optional(),
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      unit: z.string().optional(),
      basePrice: z.number().positive().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' }),
});
