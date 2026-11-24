import mongoose, { type FilterQuery, type SortOrder } from 'mongoose';
import { ERROR_CODES, type CreateProductInput, type UpdateProductInput } from '@haat/shared-contracts';
import {
  AppError,
  Category,
  Product,
  SellerProfile,
  AuditLog,
  pageMeta,
  pageRequest,
  uniqueSlug,
  deleteCloudinaryImages,
  deleteCloudinaryProductFolder,
  realtimeEventBus,
} from '@haat/shared-backend';

interface SellerContext {
  id: mongoose.Types.ObjectId;
  storeName: string;
  storeSlug: string;
  isVerified: boolean;
}

export interface SellerProductQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc';
  isActive?: boolean;
}

async function resolveSeller(userId: string): Promise<SellerContext> {
  const seller = await SellerProfile.findOne({ userId });
  if (!seller) {
    throw AppError.forbidden('Complete seller onboarding before listing products.');
  }
  if (seller.status === 'BLOCKED') {
    throw new AppError(
      ERROR_CODES.SELLER_ACCOUNT_BLOCKED,
      `Your seller account has been blocked by marketplace administration: ${seller.blockedReason || 'Please contact support.'}`,
      403,
    );
  }
  if (seller.status === 'PENDING_APPROVAL') {
    throw new AppError(
      ERROR_CODES.SELLER_ACCOUNT_PENDING,
      'Your seller application is pending administrative review. You cannot list or manage products until approved.',
      403,
    );
  }
  if (seller.status === 'REJECTED') {
    throw new AppError(
      ERROR_CODES.SELLER_ACCOUNT_REJECTED,
      `Your seller application was not approved: ${seller.statusReason || 'Please contact support.'}`,
      403,
    );
  }
  if (seller.status !== 'ACTIVE' || !seller.isActive) {
    throw AppError.forbidden('This store is not active. Contact support before listing products.');
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

async function resolveUniqueSku(candidateSku: string, exceptProductId?: unknown): Promise<string> {
  let sku = candidateSku.trim().toUpperCase();
  let clash = await Product.findOne({ sku }).select('_id').lean();
  if (!clash || String(clash._id) === String(exceptProductId)) {
    return sku;
  }
  // Auto-disambiguate with random suffix if candidate SKU clashes with another product
  while (clash && String(clash._id) !== String(exceptProductId)) {
    const salt = Math.floor(1000 + Math.random() * 9000);
    sku = `${candidateSku.trim().toUpperCase()}-${salt}`;
    clash = await Product.findOne({ sku }).select('_id').lean();
  }
  return sku;
}

export const sellerProductService = {
  async listMyProducts(userId: string, input: SellerProductQuery = {}) {
    const seller = await resolveSeller(userId);
    const pageReq = pageRequest(input);

    const filter: FilterQuery<typeof Product> = {
      sellerId: seller.id,
    };

    if (input.q && input.q.trim()) {
      filter.$text = { $search: input.q.trim() };
    }

    if (input.category) {
      if (mongoose.Types.ObjectId.isValid(input.category)) {
        filter.categoryId = new mongoose.Types.ObjectId(input.category);
      } else {
        const cat = await Category.findOne({ slug: input.category }).select('_id').lean();
        if (cat) {
          filter.categoryId = cat._id;
        } else {
          filter.categoryId = new mongoose.Types.ObjectId();
        }
      }
    }

    if (input.isActive !== undefined) {
      filter.isActive = input.isActive;
    }

    const sort: Record<string, SortOrder> = {};
    if (input.sort === 'price-asc') sort.retailPricePaise = 1;
    else if (input.sort === 'price-desc') sort.retailPricePaise = -1;
    else {
      sort.createdAt = 1;
      sort._id = 1;
    }

    const [rawItems, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .sort(sort)
        .skip(pageReq.skip)
        .limit(pageReq.limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const items = rawItems.map((item) => {
      const cat = item.categoryId && typeof item.categoryId === 'object' ? (item.categoryId as any) : null;
      return {
        ...item,
        id: String(item._id),
        categoryId: cat ? String(cat._id) : String(item.categoryId),
        categoryName: cat?.name || undefined,
      };
    });

    return { items, meta: pageMeta(pageReq, total) };
  },

  async getMyProduct(userId: string, productId: string) {
    const seller = await resolveSeller(userId);
    const product = await Product.findById(productId).lean();
    if (!product) throw AppError.notFound('Product not found.');
    if (String(product.sellerId) !== String(seller.id)) {
      throw AppError.forbidden('Access denied. This product belongs to another store.');
    }
    return {
      ...product,
      id: String(product._id),
      categoryId: String(product.categoryId),
    };
  },

  async createProduct(userId: string, input: CreateProductInput) {
    const seller = await resolveSeller(userId);
    const category = await requireCategory(input.categoryId);

    const guaranteedSku = await resolveUniqueSku(input.sku);
    input.sku = guaranteedSku;
    if (input.variants && input.variants.length > 0) {
      input.variants[0].sku = guaranteedSku;
    }

    await ensureSkuFree(input.sku);

    const slug = await uniqueSlug(input.title, async (candidate) => {
      const exists = await Product.findOne({ slug: candidate }).select('_id').lean();
      return !exists;
    });

    const product = await Product.create({
      ...(input.id ? { _id: new mongoose.Types.ObjectId(input.id) } : {}),
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
      totalPricePaise: input.totalPricePaise ?? input.retailPricePaise,
      discountPercent: input.discountPercent ?? 0,
      retailPricePaise: input.retailPricePaise,
      moq: input.moq,
      orderMultiple: input.orderMultiple,
      isWholesaleActive: input.isWholesaleActive,
      variants: normalizeVariants(input.variants),
      images: normalizeImages(input.images),
      pricingTiers: normalizeTiers(input.pricingTiers),
      isApproved: seller.isVerified,
      isActive: true,
      sellerStatus: 'ACTIVE',
    });

    await Category.updateOne({ _id: category._id }, { $inc: { productCount: 1 } });

    try {
      await AuditLog.create({
        actorUserId: userId,
        actorRole: 'SELLER',
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: product._id,
        metadata: { sku: product.sku, title: product.title },
      });
    } catch {
      // Non-blocking
    }

    void realtimeEventBus.publishProductCreated({
      productId: product._id.toString(),
      sellerId: seller.id.toString(),
      categoryId: category._id.toString(),
      action: 'CREATED',
      title: product.title,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return product;
  },

  async updateProduct(userId: string, productId: string, input: UpdateProductInput) {
    const seller = await resolveSeller(userId);
    const product = await Product.findById(productId);
    if (!product) throw AppError.notFound('Product not found.');
    if (String(product.sellerId) !== String(seller.id)) {
      throw AppError.forbidden('Access denied. This product belongs to another store.');
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
      'totalPricePaise',
      'discountPercent',
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
      product.set(
        'variants',
        input.variants.map((v) => ({
          _id: v.id ? new mongoose.Types.ObjectId(v.id) : new mongoose.Types.ObjectId(),
          sku: v.sku.toUpperCase(),
          title: v.title,
          priceModifierPaise: v.priceModifierPaise,
          stockQuantity: v.stockQuantity,
          attributes: v.attributes ?? {},
        })),
      );
    }

    if (input.images !== undefined) {
      // Check for images removed during edit and delete them from Cloudinary
      const existingPublicIds = (product.images || [])
        .map((img) => img.publicId)
        .filter(Boolean) as string[];
      const updatedPublicIds = new Set(
        input.images.map((img) => img.publicId).filter(Boolean) as string[],
      );
      const removedPublicIds = existingPublicIds.filter((id) => !updatedPublicIds.has(id));
      if (removedPublicIds.length > 0) {
        void deleteCloudinaryImages(removedPublicIds);
      }

      const ordered = [...input.images].sort((a, b) => a.displayOrder - b.displayOrder);
      let primaryTaken = false;
      product.set(
        'images',
        ordered.map((img) => {
          const isPrimary = Boolean(img.isPrimary) && !primaryTaken;
          if (isPrimary) primaryTaken = true;
          return {
            _id: img.id ? new mongoose.Types.ObjectId(img.id) : new mongoose.Types.ObjectId(),
            url: img.url,
            publicId: img.publicId ?? null,
            altText: img.altText ?? null,
            displayOrder: img.displayOrder,
            isPrimary,
          };
        }),
      );
    }

    if (input.pricingTiers !== undefined) {
      product.set('pricingTiers', normalizeTiers(input.pricingTiers));
    }

    await product.save();

    try {
      await AuditLog.create({
        actorUserId: userId,
        actorRole: 'SELLER',
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: product._id,
        metadata: { sku: product.sku },
      });
    } catch {
      // Non-blocking
    }

    void realtimeEventBus.publishProductUpdated({
      productId: product._id.toString(),
      sellerId: seller.id.toString(),
      categoryId: product.categoryId ? product.categoryId.toString() : undefined,
      action: 'UPDATED',
      title: product.title,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return product;
  },

  async archiveProduct(userId: string, productId: string) {
    const seller = await resolveSeller(userId);
    const product = await Product.findById(productId);
    if (!product) throw AppError.notFound('Product not found.');
    if (String(product.sellerId) !== String(seller.id)) {
      throw AppError.forbidden('Access denied. This product belongs to another store.');
    }

    // Collect all Cloudinary publicIds from the product images
    const publicIds = (product.images || [])
      .map((img) => img.publicId)
      .filter(Boolean) as string[];

    // Decrement category count
    await Category.updateOne({ _id: product.categoryId }, { $inc: { productCount: -1 } });

    // Permanently remove product from MongoDB immediately (instant response)
    await Product.deleteOne({ _id: product._id });

    // Clean up assets & folder from Cloudinary asynchronously in background (non-blocking)
    void (async () => {
      try {
        await deleteCloudinaryImages(publicIds);
        await deleteCloudinaryProductFolder(String(product._id));
      } catch (err) {
        console.error('Error during background Cloudinary cleanup for deleted product:', err);
      }
    })();

    try {
      await AuditLog.create({
        actorUserId: userId,
        actorRole: 'SELLER',
        action: 'PRODUCT_DELETED',
        entityType: 'Product',
        entityId: product._id,
        metadata: { sku: product.sku, title: product.title },
      });
    } catch {
      // Non-blocking
    }

    void realtimeEventBus.publishProductDeleted({
      productId: product._id.toString(),
      sellerId: seller.id.toString(),
      categoryId: product.categoryId ? product.categoryId.toString() : undefined,
      action: 'DELETED',
      title: product.title,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return product;
  },

  async adjustStock(userId: string, productId: string, variantId: string, quantity: number) {
    const seller = await resolveSeller(userId);
    const product = await Product.findById(productId);
    if (!product) throw AppError.notFound('Product not found.');
    if (String(product.sellerId) !== String(seller.id)) {
      throw AppError.forbidden('Access denied. This product belongs to another store.');
    }

    const variant = product.variants.find((v) => String(v._id) === String(variantId));
    if (!variant) throw AppError.notFound('Variant not found.');

    variant.stockQuantity = Math.max(0, quantity);
    await product.save();

    void realtimeEventBus.publishProductUpdated({
      productId: product._id.toString(),
      sellerId: seller.id.toString(),
      categoryId: product.categoryId ? product.categoryId.toString() : undefined,
      action: 'UPDATED',
      title: product.title,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return product;
  },
};
