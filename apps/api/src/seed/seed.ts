/**
 * Idempotent development seed (PRD §14.5 / TSK-P3-01).
 * Creates the category tree, a super-admin, and one verified demo seller with a small catalogue.
 *
 *   pnpm --filter @haat/api seed
 */
import { Category, Product, SellerProfile, User } from '../models';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { hashPassword } from '../utils/password';
import { slugify } from '../utils/slug';

interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  children?: Array<{ name: string; slug: string; description: string }>;
}

const CATEGORY_TREE: CategorySeed[] = [
  {
    name: 'Industrial & Hardware',
    slug: 'industrial',
    description: 'Fasteners, abrasives, power tools and workshop consumables.',
    children: [
      { name: 'Fasteners', slug: 'fasteners', description: 'Bolts, nuts, anchors and rivets.' },
      { name: 'Power Tools', slug: 'power-tools', description: 'Drills, grinders, saws and accessories.' },
    ],
  },
  {
    name: 'Electricals',
    slug: 'electricals',
    description: 'Lighting, wiring, switchgear and cable management.',
    children: [
      { name: 'Lighting', slug: 'lighting', description: 'Battens, panels, high bays and lamps.' },
      { name: 'Wiring & Cables', slug: 'wiring', description: 'House wire, flexible cable and conduit.' },
    ],
  },
  {
    name: 'Packaging & Logistics',
    slug: 'packaging',
    description: 'Boxes, tapes, strapping and warehouse supplies.',
    children: [
      { name: 'Corrugated Boxes', slug: 'corrugated-boxes', description: '3-ply and 5-ply shipping cartons.' },
    ],
  },
  {
    name: 'Safety & Workwear',
    slug: 'safety',
    description: 'Hand protection, hi-vis apparel and site safety.',
    children: [
      { name: 'Hand Protection', slug: 'hand-protection', description: 'Nitrile, latex and cut-resistant gloves.' },
      { name: 'Hi-Vis Apparel', slug: 'hi-vis-apparel', description: 'Reflective jackets, vests and trousers.' },
    ],
  },
  {
    name: 'Fashion & Textiles',
    slug: 'textiles',
    description: 'Fabric by the metre, canvas and ready-made apparel.',
    children: [
      { name: 'Fabric & Canvas', slug: 'fabric', description: 'Cotton canvas, denim and lining fabric.' },
    ],
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Cables, chargers, audio and mobile accessories.',
    children: [
      { name: 'Mobile Accessories', slug: 'mobile-accessories', description: 'Cables, adapters and power banks.' },
    ],
  },
];

interface ProductSeed {
  title: string;
  sku: string;
  brand: string;
  categorySlug: string;
  description: string;
  retailPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
  variants: Array<{ sku: string; title: string; priceModifierPaise: number; stockQuantity: number; attributes: Record<string, string> }>;
  pricingTiers: Array<{ minQuantity: number; maxQuantity: number | null; unitPricePaise: number }>;
}

const DEMO_PRODUCTS: ProductSeed[] = [
  {
    title: 'M10 Hex Bolt, Hot-Dip Galvanised',
    sku: 'HAAT-IND-0001',
    brand: 'Bharat Fasteners',
    categorySlug: 'fasteners',
    description:
      'IS 1367 grade 8.8 hex bolt with a hot-dip galvanised finish for outdoor structural work. Supplied with matching nut and washer; sold per piece with a 100-piece minimum.',
    retailPricePaise: 1850,
    moq: 100,
    orderMultiple: 50,
    isWholesaleActive: true,
    variants: [
      { sku: 'HAAT-IND-0001-G88', title: 'Grade 8.8 · 50 mm', priceModifierPaise: 0, stockQuantity: 4200, attributes: { grade: '8.8', length: '50 mm' } },
      { sku: 'HAAT-IND-0001-G109', title: 'Grade 10.9 · 50 mm', priceModifierPaise: 420, stockQuantity: 1800, attributes: { grade: '10.9', length: '50 mm' } },
    ],
    pricingTiers: [
      { minQuantity: 100, maxQuantity: 499, unitPricePaise: 1650 },
      { minQuantity: 500, maxQuantity: 1999, unitPricePaise: 1500 },
      { minQuantity: 2000, maxQuantity: null, unitPricePaise: 1375 },
    ],
  },
  {
    title: 'LED Batten 20 W, 4 ft, Cool White',
    sku: 'HAAT-ELC-0002',
    brand: 'Lumen Works',
    categorySlug: 'lighting',
    description:
      'Surface-mount aluminium batten rated for 25,000 hours with a 2-year replacement warranty. BIS certified driver, 1600 lumen output, suitable for shops and workshops.',
    retailPricePaise: 34900,
    moq: 10,
    orderMultiple: 5,
    isWholesaleActive: true,
    variants: [
      { sku: 'HAAT-ELC-0002-CW', title: 'Cool white · 6500 K', priceModifierPaise: 0, stockQuantity: 640, attributes: { colour: 'Cool white', cct: '6500 K' } },
      { sku: 'HAAT-ELC-0002-NW', title: 'Neutral white · 4000 K', priceModifierPaise: 1000, stockQuantity: 210, attributes: { colour: 'Neutral white', cct: '4000 K' } },
    ],
    pricingTiers: [
      { minQuantity: 10, maxQuantity: 49, unitPricePaise: 32900 },
      { minQuantity: 50, maxQuantity: 199, unitPricePaise: 30900 },
      { minQuantity: 200, maxQuantity: null, unitPricePaise: 28900 },
    ],
  },
  {
    title: '3-Ply Corrugated Box, 12 × 9 × 6 in',
    sku: 'HAAT-PKG-0003',
    brand: 'PackRight',
    categorySlug: 'corrugated-boxes',
    description:
      'Kraft 3-ply carton with a 5 kg safe load, plain surface for labelling and tape sealing. Ships flat in bundles; double-wall upgrade available for fragile goods.',
    retailPricePaise: 1280,
    moq: 50,
    orderMultiple: 25,
    isWholesaleActive: true,
    variants: [
      { sku: 'HAAT-PKG-0003-SW', title: 'Single wall · 3-ply', priceModifierPaise: 0, stockQuantity: 9600, attributes: { ply: '3', load: '5 kg' } },
      { sku: 'HAAT-PKG-0003-DW', title: 'Double wall · 5-ply', priceModifierPaise: 600, stockQuantity: 3200, attributes: { ply: '5', load: '12 kg' } },
    ],
    pricingTiers: [
      { minQuantity: 50, maxQuantity: 249, unitPricePaise: 1180 },
      { minQuantity: 250, maxQuantity: 999, unitPricePaise: 1050 },
      { minQuantity: 1000, maxQuantity: null, unitPricePaise: 950 },
    ],
  },
  {
    title: 'Nitrile-Coated Work Gloves, Pair',
    sku: 'HAAT-SAF-0004',
    brand: 'SiteArmour',
    categorySlug: 'hand-protection',
    description:
      'Seamless polyester knit with a nitrile palm dip for grip on oily and dry surfaces. EN 388 abrasion grade 4; machine washable at 40 °C.',
    retailPricePaise: 3400,
    moq: 20,
    orderMultiple: 10,
    isWholesaleActive: true,
    variants: [
      { sku: 'HAAT-SAF-0004-M', title: 'Size M', priceModifierPaise: 0, stockQuantity: 780, attributes: { size: 'M' } },
      { sku: 'HAAT-SAF-0004-L', title: 'Size L', priceModifierPaise: 0, stockQuantity: 1240, attributes: { size: 'L' } },
      { sku: 'HAAT-SAF-0004-XL', title: 'Size XL', priceModifierPaise: 200, stockQuantity: 360, attributes: { size: 'XL' } },
    ],
    pricingTiers: [
      { minQuantity: 20, maxQuantity: 99, unitPricePaise: 3200 },
      { minQuantity: 100, maxQuantity: 499, unitPricePaise: 2950 },
      { minQuantity: 500, maxQuantity: null, unitPricePaise: 2700 },
    ],
  },
  {
    title: 'Cotton Canvas Fabric, 12 oz, 60 in Wide',
    sku: 'HAAT-TEX-0005',
    brand: 'Loom & Co.',
    categorySlug: 'fabric',
    description:
      'Heavy 12 oz cotton canvas in a plain weave, sold by the running metre at 60-inch width. Colour-fast to 40 washes; ideal for bags, awnings and upholstery.',
    retailPricePaise: 42000,
    moq: 10,
    orderMultiple: 5,
    isWholesaleActive: true,
    variants: [
      { sku: 'HAAT-TEX-0005-NAT', title: 'Natural', priceModifierPaise: 0, stockQuantity: 420, attributes: { colour: 'Natural' } },
      { sku: 'HAAT-TEX-0005-BLK', title: 'Dyed black', priceModifierPaise: 3500, stockQuantity: 180, attributes: { colour: 'Black' } },
    ],
    pricingTiers: [
      { minQuantity: 10, maxQuantity: 49, unitPricePaise: 39500 },
      { minQuantity: 50, maxQuantity: null, unitPricePaise: 37000 },
    ],
  },
  {
    title: 'USB-C Braided Cable, 1.5 m, 60 W',
    sku: 'HAAT-ELX-0006',
    brand: 'VoltLine',
    categorySlug: 'mobile-accessories',
    description:
      '60 W USB-C to USB-C cable with a nylon braid and aluminium shell, rated for 10,000 bend cycles. Supports USB 2.0 data at 480 Mbps. Retail packed, sold in fives.',
    retailPricePaise: 24900,
    moq: 5,
    orderMultiple: 5,
    isWholesaleActive: false,
    variants: [
      { sku: 'HAAT-ELX-0006-BLK', title: 'Black', priceModifierPaise: 0, stockQuantity: 260, attributes: { colour: 'Black' } },
      { sku: 'HAAT-ELX-0006-WHT', title: 'White', priceModifierPaise: 0, stockQuantity: 140, attributes: { colour: 'White' } },
    ],
    pricingTiers: [],
  },
];

const ADMIN = {
  fullName: 'HAAT Platform Admin',
  phoneNumber: '9000000001',
  email: 'admin@haat.local',
  password: 'Admin@12345',
};

const DEMO_SELLER = {
  fullName: 'Ravi Menon',
  phoneNumber: '9876543210',
  email: 'seller@haat.local',
  password: 'Seller@12345',
  storeName: 'Menon Industrial Supply',
  storeSlug: 'menon-industrial',
  description:
    'Chennai-based supplier of fasteners, lighting and site consumables. Serving workshops and contractors across Tamil Nadu since 2014.',
  gstin: '33ABCDE1234F1Z5',
  panNumber: 'ABCDE1234F',
  bankAccountName: 'Menon Industrial Supply',
  bankAccountNo: '123456789012',
  bankIfscCode: 'HDFC0001234',
  servicePincodes: ['600001', '600002', '600028', '600032', '600042', '600096'],
};

async function seedCategories(): Promise<Map<string, { id: string; path: string }>> {
  const bySlug = new Map<string, { id: string; path: string }>();

  for (const [index, root] of CATEGORY_TREE.entries()) {
    const rootDoc = await Category.findOneAndUpdate(
      { slug: root.slug },
      {
        $set: {
          name: root.name,
          description: root.description,
          parentId: null,
          path: root.slug,
          depth: 0,
          displayOrder: index,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    bySlug.set(root.slug, { id: String(rootDoc._id), path: rootDoc.path });

    for (const [childIndex, child] of (root.children ?? []).entries()) {
      const childDoc = await Category.findOneAndUpdate(
        { slug: child.slug },
        {
          $set: {
            name: child.name,
            description: child.description,
            parentId: rootDoc._id,
            path: `${root.slug}/${child.slug}`,
            depth: 1,
            displayOrder: childIndex,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      bySlug.set(child.slug, { id: String(childDoc._id), path: childDoc.path });
    }
  }

  console.log(`categories: ${bySlug.size} upserted`);
  return bySlug;
}

async function seedUsers() {
  const adminHash = await hashPassword(ADMIN.password);
  await User.findOneAndUpdate(
    { phoneNumber: ADMIN.phoneNumber },
    {
      $set: {
        fullName: ADMIN.fullName,
        email: ADMIN.email,
        passwordHash: adminHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const sellerHash = await hashPassword(DEMO_SELLER.password);
  const sellerUser = await User.findOneAndUpdate(
    { phoneNumber: DEMO_SELLER.phoneNumber },
    {
      $set: {
        fullName: DEMO_SELLER.fullName,
        email: DEMO_SELLER.email,
        passwordHash: sellerHash,
        role: 'SELLER',
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const sellerProfile = await SellerProfile.findOneAndUpdate(
    { userId: sellerUser._id },
    {
      $set: {
        storeName: DEMO_SELLER.storeName,
        storeSlug: DEMO_SELLER.storeSlug,
        description: DEMO_SELLER.description,
        gstin: DEMO_SELLER.gstin,
        panNumber: DEMO_SELLER.panNumber,
        bankAccountName: DEMO_SELLER.bankAccountName,
        bankAccountNo: DEMO_SELLER.bankAccountNo,
        bankIfscCode: DEMO_SELLER.bankIfscCode,
        servicePincodes: DEMO_SELLER.servicePincodes,
        kycStatus: 'APPROVED',
        isVerified: true,
        isActive: true,
        onboardingCompletedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log('users: admin + demo seller ready');
  return sellerProfile;
}

async function seedProducts(sellerProfile: Awaited<ReturnType<typeof seedUsers>>, categories: Map<string, { id: string; path: string }>) {
  for (const seed of DEMO_PRODUCTS) {
    const exists = await Product.exists({ sku: seed.sku });
    if (exists) continue;

    const category = categories.get(seed.categorySlug);
    if (!category) {
      console.warn(`skip ${seed.sku}: category ${seed.categorySlug} missing`);
      continue;
    }

    let slug = slugify(seed.title);
    if (await Product.exists({ slug })) slug = `${slug}-${seed.sku.toLowerCase()}`;

    await Product.create({
      sellerId: sellerProfile._id,
      sellerName: sellerProfile.storeName,
      sellerSlug: sellerProfile.storeSlug,
      categoryId: category.id,
      categoryPath: category.path,
      title: seed.title,
      slug,
      description: seed.description,
      sku: seed.sku,
      brand: seed.brand,
      retailPricePaise: seed.retailPricePaise,
      moq: seed.moq,
      orderMultiple: seed.orderMultiple,
      isWholesaleActive: seed.isWholesaleActive,
      variants: seed.variants,
      images: [],
      pricingTiers: seed.pricingTiers,
      isActive: true,
      isApproved: true,
    });

    await Category.updateOne({ _id: category.id }, { $inc: { productCount: 1 } });
  }

  console.log(`products: ${DEMO_PRODUCTS.length} seed entries reconciled`);
}

async function main(): Promise<void> {
  await connectDatabase();

  await Promise.all([User.init(), SellerProfile.init(), Category.init(), Product.init()]);

  const categories = await seedCategories();
  const seller = await seedUsers();
  await seedProducts(seller, categories);

  console.log('\nSeed complete.');
  console.log(`  admin  → ${ADMIN.phoneNumber} / ${ADMIN.password}`);
  console.log(`  seller → ${DEMO_SELLER.phoneNumber} / ${DEMO_SELLER.password}  (${DEMO_SELLER.storeSlug})`);

  await disconnectDatabase();
}

void main().catch(async (error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
