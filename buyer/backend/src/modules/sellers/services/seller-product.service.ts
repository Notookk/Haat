import mongoose, { type FilterQuery, type SortOrder } from 'mongoose';
import {
  ERROR_CODES,
  type CreateProductInput,
  type ProductQueryInput,
  type UpdateProductInput,
} from '@haat/shared-contracts';
import {
  AppError,
  Category,
  Product,
  SellerProfile,
  type ProductAttributes,
  pageMeta,
  pageRequest,
  uniqueSlug,
} from '@haat/shared-backend';
import { categorySubtreeIds } from '../../categories/services/category.service';
import { toProductView, type ProductView } from '../../catalog/catalog.dto';

interface SellerContext {
  id: mongoose.Types.ObjectId;
  storeName: string;
  storeSlug: string;
  isVerified: boolean;
}

async function resolveSeller(userId: string): Promise<SellerContext> {
  const seller = await SellerProfile.findOne({ userId });
  if (!seller) {
    throw AppError.forbidden('Complete seller onboarding before listing products.');
  }
  if (!seller.isActive) {
    throw AppError.forbidden('This store is suspended. Contact support before listing products.');
  }
  return {
    id: seller._id,
    storeName: seller.storeName,
    storeSlug: seller.storeSlug,
    isVerified: seller.isVerified,
  };
}

async function requireCategory(categoryId: string) {
  const category = await Category.findOne({ _id: categoryId, isActive: true }).lean();
  if (!category) throw AppError.badRequest('Select an active category.');
  return category;
}

function normalizeImages(images: CreateProductInput['images']) {
  const ordered = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  let primaryTaken = false;

  const normalized = ordered.map((image) => {
    const isPrimary = Boolean(image.isPrimary) && !primaryTaken;
    if (isPrimary) primaryTaken = true;
    return {
      url: image.url,
      publicId: image.publicId ?? null,
      altText: image.altText ?? null,
      displayOrder: image.displayOrder,
      isPrimary,
    };
  });

  if (!primaryTaken && normalized.length > 0) normalized[0].isPrimary = true;
  return normalized;
}

function normalizeVariants(variants: CreateProductInput['variants']) {
  return variants.map((variant) => ({
    _id: new mongoose.Types.ObjectId(),
    sku: variant.sku.toUpperCase(),
    title: variant.title,
    priceModifierPaise: variant.priceModifierPaise,
    stockQuantity: variant.stockQuantity,
    attributes: variant.attributes ?? {},
  }));
}

function normalizeTiers(tiers: CreateProductInput['pricingTiers']) {
  return (tiers ?? []).map((tier) => ({
    minQuantity: tier.minQuantity,
    maxQuantity: tier.maxQuantity ?? null,
    unitPricePaise: tier.unitPricePaise,
  }));
}

async function ensureSkuFree(sku: string, exceptProductId?: unknown) {
  const clash = await Product.findOne({ sku: sku.toUpperCase() }).select('_id').lean();
  if (clash && String(clash._id) !== String(exceptProductId)) {
    throw AppError.conflict('A product with this SKU already exists.', ERROR_CODES.DUPLICATE_KEY);
  }
}

export async function createProduct(userId: string, input: CreateProductInput): Promise<ProductView> {
  const seller = await resolveSeller(userId);
  const category = await requireCategory(input.categoryId);

  await ensureSkuFree(input.sku);

  const slug = await uniqueSlug(input.title, async (candidate) => {
    const exists = await Product.findOne({ slug: candidate }).select('_id').lean();
    return !exists;
  });

  const product = await Product.create({
    sellerId: seller.id,
    sellerName: seller.storeName,
    sellerSlug: seller.storeSlug,
    categoryId: category._id,
    categoryPath: category.path,
    title: input.title,
    slug,
    description: input.description,
    sku: input.sku.toUpperCase(),
    brand: input.brand ?? null,
    retailPricePaise: input.retailPricePaise,
    moq: input.moq,
    orderMultiple: input.orderMultiple,
    isWholesaleActive: input.isWholesaleActive,
    variants: normalizeVariants(input.variants),
    images: normalizeImages(input.images),
    pricingTiers: normalizeTiers(input.pricingTiers),
    isApproved: seller.isVerified,
    isActive: true,
  });

  await Category.updateOne({ _id: category._id }, { $inc: { productCount: 1 } });

  return toProductView(product.toObject());
}

export async function updateProduct(
  userId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<ProductView> {
  const seller = await resolveSeller(userId);
  const product = await Product.findById(productId);
  if (!product) throw AppError.notFound('Product not found.');
  if (String(product.sellerId) !== String(seller.id)) {
    throw AppError.forbidden('This product belongs to another store.');
  }

  if (input.sku !== undefined) {
    await ensureSkuFree(input.sku, product._id);
    product.set('sku', input.sku.toUpperCase());
  }

  if (input.categoryId !== undefined && String(input.categoryId) !== String(product.categoryId)) {
    const category = await requireCategory(input.categoryId);
    await Category.updateOne({ _id: product.categoryId }, { $inc: { productCount: -1 } });
    await Category.updateOne({ _id: category._id }, { $inc: { productCount: 1 } });
    product.set('categoryId', category._id);
    product.set('categoryPath', category.path);
  }

  const scalarKeys = [
    'title',
    'description',
    'brand',
    'retailPricePaise',
    'moq',
    'orderMultiple',
    'isWholesaleActive',
    'isActive',
  ] as const;

  for (const key of scalarKeys) {
    if (input[key] !== undefined) product.set(key, input[key]);
  }

  if (input.variants !== undefined) {
    const existing = new Map(product.variants.map((variant) => [String(variant._id), variant._id]));
    product.set(
      'variants',
      input.variants.map((variant) => ({
        _id: variant.id && existing.has(variant.id) ? existing.get(variant.id) : new mongoose.Types.ObjectId(),
        sku: variant.sku.toUpperCase(),
        title: variant.title,
        priceModifierPaise: variant.priceModifierPaise,
        stockQuantity: variant.stockQuantity,
        attributes: variant.attributes ?? {},
      })),
    );
  }

  if (input.images !== undefined) {
    const existing = new Map(product.images.map((image) => [String(image._id), image._id]));
    const ordered = [...input.images].sort((a, b) => a.displayOrder - b.displayOrder);
    let primaryTaken = false;

    const images = ordered.map((image) => {
      const isPrimary = Boolean(image.isPrimary) && !primaryTaken;
      if (isPrimary) primaryTaken = true;
      return {
        _id: image.id && existing.has(image.id) ? existing.get(image.id) : new mongoose.Types.ObjectId(),
        url: image.url,
        publicId: image.publicId ?? null,
        altText: image.altText ?? null,
        displayOrder: image.displayOrder,
        isPrimary,
      };
    });

    if (!primaryTaken && images.length > 0) images[0].isPrimary = true;
    product.set('images', images);
  }

  if (input.pricingTiers !== undefined) {
    product.set('pricingTiers', normalizeTiers(input.pricingTiers));
  }

  await product.save();
  return toProductView(product.toObject());
}

export async function archiveProduct(userId: string, productId: string): Promise<ProductView> {
  const seller = await resolveSeller(userId);
  const product = await Product.findById(productId);
  if (!product) throw AppError.notFound('Product not found.');
  if (String(product.sellerId) !== String(seller.id)) {
    throw AppError.forbidden('This product belongs to another store.');
  }

  product.set('isActive', false);
  await product.save();
  return toProductView(product.toObject());
}

export async function getMyProduct(userId: string, productId: string): Promise<ProductView> {
  const seller = await resolveSeller(userId);
  const product = await Product.findById(productId).lean();
  if (!product) throw AppError.notFound('Product not found.');
  if (String(product.sellerId) !== String(seller.id)) {
    throw AppError.forbidden('This product belongs to another store.');
  }
  return toProductView(product);
}

function sortFor(sort: ProductQueryInput['sort']): Record<string, SortOrder> {
  switch (sort) {
    case 'price-asc':
      return { retailPricePaise: 1, _id: 1 };
    case 'price-desc':
      return { retailPricePaise: -1, _id: 1 };
    default:
      return { createdAt: -1, _id: 1 };
  }
}

export async function listMyProducts(
  userId: string,
  query: ProductQueryInput,
): Promise<{ items: ProductView[]; meta: ReturnType<typeof pageMeta> }> {
  const seller = await resolveSeller(userId);
  const page = pageRequest(query);

  const filter: FilterQuery<ProductAttributes> = { sellerId: seller.id };
  if (query.q) filter.$text = mongoose.trusted({ $search: query.q });
  if (query.category) {
    const subtree = await categorySubtreeIds(query.category);
    if (!subtree) return { items: [], meta: pageMeta(page, 0) };
    filter.categoryId = mongoose.trusted({
      $in: subtree.ids.map((id: string) => new mongoose.Types.ObjectId(id)),
    });
  }

  const [rows, total] = await Promise.all([
    Product.find(filter).sort(sortFor(query.sort)).skip(page.skip).limit(page.limit).lean(),
    Product.countDocuments(filter),
  ]);

  return { items: rows.map(toProductView), meta: pageMeta(page, total) };
}
