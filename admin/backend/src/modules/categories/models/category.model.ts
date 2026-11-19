import { Category } from '@haat/shared-backend';
import type { AdminCategoryCreateInput, AdminCategoryUpdateInput } from '../validators/category.validator';

export const adminCategoryModel = {
  async listAllCategories() {
    return Category.find().sort({ displayOrder: 1, name: 1 }).lean();
  },

  async findCategoryById(id: string) {
    return Category.findById(id).lean();
  },

  async findCategoryBySlug(slug: string) {
    return Category.findOne({ slug }).lean();
  },

  async findCategoryByPath(path: string) {
    return Category.findOne({ path }).lean();
  },

  async createCategory(data: AdminCategoryCreateInput & { depth: number; path: string }) {
    return Category.create(data);
  },

  async updateCategory(id: string, data: AdminCategoryUpdateInput) {
    return Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  },

  async deleteCategory(id: string) {
    return Category.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
  },
};
