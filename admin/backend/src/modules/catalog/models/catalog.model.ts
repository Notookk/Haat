import mongoose from 'mongoose';
import { Product } from '@haat/shared-backend';

export interface CatalogFilter {
  search?: string;
  categoryId?: string;
  sellerId?: string;
  isApproved?: boolean;
  page?: number;
  limit?: number;
}

export const adminCatalogModel = {
  async listProducts(filter: CatalogFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isActive: true };

    if (filter.isApproved !== undefined) {
      query.isApproved = filter.isApproved;
    }

    if (filter.categoryId) {
      query.categoryId = filter.categoryId;
    }

    if (filter.sellerId) {
      query.sellerId = filter.sellerId;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), 'i');
      query.$or = [{ title: regex }, { sku: regex }, { brand: regex }, { sellerName: regex }];
    }

    const trustedQuery = mongoose.trusted(query);

    const [products, total] = await Promise.all([
      Product.find(trustedQuery)
        .populate('categoryId', 'name slug')
        .populate('sellerId', 'storeName storeSlug gstin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(trustedQuery),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findProductById(id: string) {
    return Product.findById(id)
      .populate('categoryId', 'name slug path')
      .populate('sellerId', 'storeName storeSlug gstin panNumber')
      .lean();
  },

  async moderateProduct(id: string, isApproved: boolean) {
    return Product.findByIdAndUpdate(id, { $set: { isApproved } }, { new: true, runValidators: true }).lean();
  },
};
