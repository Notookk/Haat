import type { FilterQuery, SortOrder } from 'mongoose';
import { Category, Product, type ProductAttributes } from '@haat/shared-backend';

export const catalogModel = {
  async findPublicProducts(
    filter: FilterQuery<ProductAttributes>,
    sort: Record<string, SortOrder>,
    skip: number,
    limit: number,
  ) {
    return Product.find(filter)
      .populate('categoryId', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  async countPublicProducts(filter: FilterQuery<ProductAttributes>) {
    return Product.countDocuments(filter);
  },

  async findPublicProductBySlug(slug: string) {
    return Product.findOne({ slug, isActive: true, isApproved: true, sellerStatus: 'ACTIVE' })
      .populate('categoryId', 'name slug')
      .lean();
  },

  async findActiveCategories() {
    return Category.find({ isActive: true }).sort({ depth: 1, createdAt: 1, _id: 1 }).lean();
  },
};
