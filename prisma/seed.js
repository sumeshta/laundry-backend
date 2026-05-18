import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@freshfold.local' },
    update: {},
    create: {
      email: 'admin@freshfold.local',
      passwordHash,
      fullName: 'Platform Admin',
      phone: '+919999999999',
      role: 'admin',
    },
  });

  const customerHash = await bcrypt.hash('Customer@123', 12);
  await prisma.user.upsert({
    where: { email: 'anita@email.com' },
    update: {},
    create: {
      email: 'anita@email.com',
      passwordHash: customerHash,
      fullName: 'Anita Sharma',
      phone: '+919876543210',
      role: 'customer',
      customerProfile: { create: {} },
      addresses: {
        create: {
          label: 'Home',
          line1: '42, 5th Cross, Koramangala',
          city: 'Bangalore',
          postalCode: '560034',
          latitude: 12.9352,
          longitude: 77.6245,
          isDefault: true,
        },
      },
    },
  });

  const hubs = [
    {
      name: 'Koramangala Branch',
      code: 'BLR-KOR',
      line1: '80 Feet Road, Koramangala',
      city: 'Bangalore',
      postalCode: '560034',
      phone: '+918012345601',
      latitude: 12.9352,
      longitude: 77.6245,
      radiusKm: 6,
    },
    {
      name: 'Indiranagar Branch',
      code: 'BLR-IND',
      line1: '100 Feet Road, Indiranagar',
      city: 'Bangalore',
      postalCode: '560038',
      phone: '+918012345602',
      latitude: 12.9784,
      longitude: 77.6408,
      radiusKm: 5,
    },
    {
      name: 'Whitefield Branch',
      code: 'BLR-WFD',
      line1: 'ITPL Main Road, Whitefield',
      city: 'Bangalore',
      postalCode: '560066',
      phone: '+918012345603',
      latitude: 12.9698,
      longitude: 77.75,
      radiusKm: 8,
    },
  ];

  const hubRecords = [];
  for (const h of hubs) {
    const hub = await prisma.hub.upsert({
      where: { code: h.code },
      update: h,
      create: h,
    });
    hubRecords.push(hub);
  }

  const categories = [
    { name: 'Wash & Fold', slug: 'wash-fold', sortOrder: 1 },
    { name: 'Dry Clean', slug: 'dry-clean', sortOrder: 2 },
    { name: 'Ironing', slug: 'ironing', sortOrder: 3 },
  ];

  const catRecords = [];
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    catRecords.push(cat);
  }

  const products = [
    { categorySlug: 'wash-fold', name: 'Shirt', slug: 'shirt-wash', unit: 'piece', basePrice: 45 },
    { categorySlug: 'wash-fold', name: 'Trousers', slug: 'trousers-wash', unit: 'piece', basePrice: 55 },
    { categorySlug: 'wash-fold', name: 'Bed sheet', slug: 'bedsheet-wash', unit: 'piece', basePrice: 120 },
    { categorySlug: 'dry-clean', name: 'Suit (2-piece)', slug: 'suit-dry', unit: 'piece', basePrice: 350 },
    { categorySlug: 'dry-clean', name: 'Saree', slug: 'saree-dry', unit: 'piece', basePrice: 280 },
    { categorySlug: 'ironing', name: 'Shirt ironing', slug: 'shirt-iron', unit: 'piece', basePrice: 25 },
  ];

  for (const p of products) {
    const cat = catRecords.find((c) => c.slug === p.categorySlug);
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        unit: p.unit,
        basePrice: p.basePrice,
        categoryId: cat.id,
      },
      create: {
        name: p.name,
        slug: p.slug,
        unit: p.unit,
        basePrice: p.basePrice,
        categoryId: cat.id,
      },
    });
  }

  const korHub = hubRecords.find((h) => h.code === 'BLR-KOR');
  const staffHash = await bcrypt.hash('Staff@123', 12);

  await prisma.user.upsert({
    where: { email: 'pickup@freshfold.local' },
    update: {},
    create: {
      email: 'pickup@freshfold.local',
      passwordHash: staffHash,
      fullName: 'Ravi Pickup',
      phone: '+919888877766',
      role: 'staff',
      staffProfile: {
        create: { hubId: korHub.id, staffRole: 'pickup' },
      },
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', currency: 'INR' },
  });

  console.log('Seed complete.');
  console.log('  Admin:    admin@freshfold.local / Admin@123');
  console.log('  Customer: anita@email.com / Customer@123');
  console.log('  Staff:    pickup@freshfold.local / Staff@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
