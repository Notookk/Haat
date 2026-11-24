import { ERROR_CODES } from '@haat/shared-contracts';
import { AppError, AuditLog, Category, Product, SellerProfile, slugify, realtimeEventBus } from '@haat/shared-backend';
import { adminCatalogModel, type CatalogFilter } from '../models/catalog.model';

export const adminCatalogService = {
  async listProducts(filter: CatalogFilter) {
    return adminCatalogModel.listProducts(filter);
  },

  async getProduct(id: string) {
    const product = await adminCatalogModel.findProductById(id);
    if (!product) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found.', 404);
    }
    return product;
  },

  async createProduct(params: {
    sellerId: string;
    categoryId: string;
    title: string;
    slug?: string;
    description: string;
    sku: string;
    brand?: string | null;
    retailPricePaise: number;
    moq?: number;
    orderMultiple?: number;
    isWholesaleActive?: boolean;
    variants: Array<{
      sku: string;
      title: string;
      priceModifierPaise?: number;
      stockQuantity: number;
      attributes?: Record<string, string>;
    }>;
    images?: Array<{ url: string; altText?: string; sortOrder?: number }>;
    pricingTiers?: Array<{ minQuantity: number; maxQuantity?: number | null; unitPricePaise: number }>;
    adminUserId: string;
    ipAddress?: string;
  }) {
    const seller = await SellerProfile.findById(params.sellerId).lean();
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Target seller profile not found.', 404);
    }

    const category = await Category.findById(params.categoryId).lean();
    if (!category) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Target category not found.', 404);
    }

    const slug = (params.slug || slugify(params.title)).toLowerCase();

    const existingSku = await Product.findOne({ sku: params.sku.toUpperCase() });
    if (existingSku) {
      throw new AppError(ERROR_CODES.CONFLICT, `SKU ${params.sku} is already in use.`, 409);
    }

    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      throw new AppError(ERROR_CODES.CONFLICT, `Slug ${slug} is already in use.`, 409);
    }

    const created = await Product.create({
      sellerId: seller._id,
      sellerName: seller.storeName,
      sellerSlug: seller.storeSlug,
      categoryId: category._id,
      categoryPath: category.path,
      title: params.title.trim(),
      slug,
      description: params.description.trim(),
      sku: params.sku.trim().toUpperCase(),
      brand: params.brand?.trim() || null,
      retailPricePaise: params.retailPricePaise,
      moq: params.moq ?? 1,
      orderMultiple: params.orderMultiple ?? 1,
      isWholesaleActive: Boolean(params.isWholesaleActive),
      variants: params.variants.map((v) => ({
        sku: v.sku.trim().toUpperCase(),
        title: v.title.trim(),
        priceModifierPaise: v.priceModifierPaise ?? 0,
        stockQuantity: v.stockQuantity,
        attributes: v.attributes ?? {},
      })),
      images: params.images ?? [],
      pricingTiers: params.pricingTiers ?? [],
      isActive: true,
      isApproved: true,
    });

    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: String(created._id),
      metadata: {
        sku: created.sku,
        title: created.title,
        sellerId: String(seller._id),
        retailPricePaise: created.retailPricePaise,
      },
      ipAddress: params.ipAddress ?? null,
    });

    void realtimeEventBus.publishProductCreated({
      productId: String(created._id),
      sellerId: String(seller._id),
      categoryId: String(category._id),
      action: 'CREATED',
      title: created.title,
      slug: created.slug,
      timestamp: new Date().toISOString(),
    });

    return created;
  },

  async updateProduct(params: {
    productId: string;
    input: Partial<{
      title: string;
      description: string;
      brand: string | null;
      retailPricePaise: number;
      moq: number;
      orderMultiple: number;
      isWholesaleActive: boolean;
      isActive: boolean;
      isApproved: boolean;
      variants: any[];
      images: any[];
      pricingTiers: any[];
    }>;
    adminUserId: string;
    ipAddress?: string;
  }) {
    const existing = await Product.findById(params.productId);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found.', 404);
    }

    Object.assign(existing, params.input);
    await existing.save();

    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: String(existing._id),
      metadata: {
        sku: existing.sku,
        title: existing.title,
        changes: Object.keys(params.input),
      },
      ipAddress: params.ipAddress ?? null,
    });

    void realtimeEventBus.publishProductUpdated({
      productId: String(existing._id),
      sellerId: String(existing.sellerId),
      categoryId: existing.categoryId ? String(existing.categoryId) : undefined,
      action: 'UPDATED',
      title: existing.title,
      slug: existing.slug,
      timestamp: new Date().toISOString(),
    });

    return existing;
  },

  async moderateProduct(params: {
    productId: string;
    isApproved: boolean;
    reason: string;
    adminUserId: string;
    ipAddress?: string;
  }) {
    const product = await adminCatalogModel.findProductById(params.productId);
    if (!product) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found.', 404);
    }

    const previousApproval = product.isApproved;
    const updated = await adminCatalogModel.moderateProduct(params.productId, params.isApproved);

    // Record immutable audit log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: params.isApproved ? 'PRODUCT_APPROVED' : 'PRODUCT_SUSPENDED',
      entityType: 'Product',
      entityId: params.productId,
      metadata: {
        previousApproval,
        newApproval: params.isApproved,
        reason: params.reason,
        sku: product.sku,
        title: product.title,
        sellerId: String(product.sellerId?._id || product.sellerId),
      },
      ipAddress: params.ipAddress ?? null,
    });

    void realtimeEventBus.publishProductUpdated({
      productId: params.productId,
      sellerId: String(product.sellerId?._id || product.sellerId),
      action: 'UPDATED',
      title: product.title,
      slug: product.slug,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },
};
