import { prisma } from '../lib/prisma.js';
import { notFound } from '../utils/errors.js';
import { mapProduct } from '../utils/serialize.js';

export async function listCategories(activeOnly = true) {
  return prisma.category.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  });
}

export async function listProducts({ categoryId, activeOnly = true } = {}) {
  const products = await prisma.product.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
    orderBy: { name: 'asc' },
  });
  return products.map(mapProduct);
}

export async function createCategory(data) {
  return prisma.category.create({ data });
}

export async function updateCategory(id, data) {
  await prisma.category.findUniqueOrThrow({ where: { id } });
  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  return prisma.category.update({ where: { id }, data: payload });
}

export async function deleteCategory(id) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!cat) throw notFound('Category not found');

  if (cat._count.products === 0) {
    await prisma.category.delete({ where: { id } });
    return { id, deleted: true };
  }

  const lineItemCount = await prisma.orderLineItem.count({
    where: { product: { categoryId: id } },
  });

  if (lineItemCount > 0) {
    await prisma.$transaction([
      prisma.product.updateMany({ where: { categoryId: id }, data: { isActive: false } }),
      prisma.category.update({ where: { id }, data: { isActive: false } }),
    ]);
    return prisma.category.findUniqueOrThrow({ where: { id } });
  }

  await prisma.$transaction([
    prisma.product.deleteMany({ where: { categoryId: id } }),
    prisma.category.delete({ where: { id } }),
  ]);
  return { id, deleted: true };
}

export async function createProduct(data) {
  const product = await prisma.product.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      slug: data.slug,
      unit: data.unit || 'piece',
      basePrice: data.basePrice,
      isActive: data.isActive ?? true,
    },
    include: { category: true },
  });
  return mapProduct(product);
}

export async function updateProduct(id, data) {
  await prisma.product.findUniqueOrThrow({ where: { id } });
  const payload = {};
  if (data.categoryId !== undefined) payload.categoryId = data.categoryId;
  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.unit !== undefined) payload.unit = data.unit;
  if (data.basePrice !== undefined) payload.basePrice = data.basePrice;
  if (data.isActive !== undefined) payload.isActive = data.isActive;

  const product = await prisma.product.update({
    where: { id },
    data: payload,
    include: { category: true },
  });
  return mapProduct(product);
}

export async function deleteProduct(id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound('Product not found');

  const lineItemCount = await prisma.orderLineItem.count({ where: { productId: id } });
  if (lineItemCount > 0) {
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: { category: true },
    });
    return { ...mapProduct(updated), deactivated: true };
  }

  try {
    await prisma.product.delete({ where: { id } });
    return { id, deleted: true };
  } catch (err) {
    if (err.code === 'P2003') {
      const updated = await prisma.product.update({
        where: { id },
        data: { isActive: false },
        include: { category: true },
      });
      return { ...mapProduct(updated), deactivated: true };
    }
    throw err;
  }
}

export async function getProduct(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) throw notFound('Product not found');
  return mapProduct(product);
}
