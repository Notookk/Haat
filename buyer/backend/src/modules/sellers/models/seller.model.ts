import type { FilterQuery, SortOrder } from 'mongoose';
import { Category, Product, SellerProfile, User } from '@haat/shared-backend';

export const sellerModel = {
  async findByUserId(userId: string) {
    return SellerProfile.findOne({ userId }).lean();
  },

  async findBySlug(storeSlug: string) {
    return SellerProfile.findOne({ storeSlug }).select('_id').lean();
  },

  async findByGstin(gstin: string) {
    return SellerProfile.findOne({ gstin }).select('_id').lean();
  },

  async createSellerProfile(data: Record<string, unknown>) {
    return SellerProfile.create(data);
  },

  async upgradeUserRoleToSeller(userId: string) {
    return User.updateOne({ _id: userId, role: 'BUYER' }, { $set: { role: 'SELLER' } });
  },

  async findActiveCategory(categoryId: string) {
    return Category.findOne({ _id: categoryId, isActive: true }).lean();
  },

  async findProductClashes(sku: string, slug: string) {
    return Product.findOne({ $or: [{ sku }, { slug }] })
      .select('sku slug')
      .lean();
  },

  async findProductBySku(sku: string) {
    return Product.findOne({ sku }).select('_id').lean();
  },

  async findProductBySlug(slug: string) {
    return Product.findOne({ slug }).select('_id').lean();
  },

  async findSellerProducts(filter: FilterQuery<unknown>, sort: Record<string, SortOrder>, skip: number, limit: number) {
    return Product.find(filter).sort(sort).skip(skip).limit(limit).lean();
  },

  async countSellerProducts(filter: FilterQuery<unknown>) {
    return Product.countDocuments(filter);
  },

  async findSellerProductById(productId: string, sellerId: unknown) {
    return Product.findOne({ _id: productId, sellerId }).lean();
  },

  async createProductRecord(data: Record<string, unknown>) {
    return Product.create(data);
  },

  async updateProductRecord(productId: string, sellerId: unknown, updates: Record<string, unknown>) {
    return Product.findOneAndUpdate(
      { _id: productId, sellerId },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();
  },

  async incrementCategoryProductCount(categoryId: unknown) {
    return Category.updateOne({ _id: categoryId }, { $inc: { productCount: 1 } });
  },
};
