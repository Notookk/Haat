import { ERROR_CODES } from '@haat/shared-contracts';
import { AppError, AuditLog, deleteCloudinaryImages, extractCloudinaryPublicId, realtimeEventBus } from '@haat/shared-backend';
import { adminCategoryModel } from '../models/category.model';
import type { AdminCategoryCreateInput, AdminCategoryUpdateInput } from '../validators/category.validator';

export const adminCategoryService = {
  async listCategories() {
    return adminCategoryModel.listAllCategories();
  },

  async getCategory(id: string) {
    const category = await adminCategoryModel.findCategoryById(id);
    if (!category) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Category not found.', 404);
    }
    return category;
  },

  async createCategory(input: AdminCategoryCreateInput, adminUserId: string) {
    let parentPath: string | null = null;
    let depth = 0;

    if (input.parentId) {
      const parent = await adminCategoryModel.findCategoryById(input.parentId);
      if (!parent) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'The selected parent category does not exist.', 400);
      }
      if (parent.depth >= 3) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'The category tree is limited to four levels.', 400);
      }
      parentPath = parent.path;
      depth = parent.depth + 1;
    }

    const path = parentPath ? `${parentPath}/${input.slug}` : input.slug;

    const existingSlug = await adminCategoryModel.findCategoryBySlug(input.slug);
    if (existingSlug) {
      throw new AppError(ERROR_CODES.CONFLICT, 'A category with this slug already exists.', 409);
    }

    const created = await adminCategoryModel.createCategory({
      ...input,
      depth,
      path,
    });

    await AuditLog.create({
      actorUserId: adminUserId,
      action: 'CATEGORY_CREATE',
      entityType: 'Category',
      entityId: String(created._id),
      metadata: { name: created.name, slug: created.slug, path: created.path },
    });

    void realtimeEventBus.publishCategoryCreated({
      categoryId: String(created._id),
      action: 'CREATED',
      name: created.name,
      slug: created.slug,
      timestamp: new Date().toISOString(),
    });

    return created;
  },

  async updateCategory(id: string, input: AdminCategoryUpdateInput, adminUserId: string) {
    const existing = await adminCategoryModel.findCategoryById(id);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Category not found.', 404);
    }

    const updated = await adminCategoryModel.updateCategory(id, input);

    await AuditLog.create({
      actorUserId: adminUserId,
      action: 'CATEGORY_UPDATE',
      entityType: 'Category',
      entityId: id,
      metadata: { changes: input },
    });

    if (updated) {
      void realtimeEventBus.publishCategoryUpdated({
        categoryId: id,
        action: 'UPDATED',
        name: updated.name,
        slug: updated.slug,
        timestamp: new Date().toISOString(),
      });
    }

    return updated;
  },

  async deleteCategory(id: string, adminUserId: string) {
    const existing = await adminCategoryModel.findCategoryById(id);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Category not found.', 404);
    }

    const imagePublicId = (existing as any).imagePublicId || extractCloudinaryPublicId((existing as any).imageUrl);

    const deactivated = await adminCategoryModel.deleteCategory(id);

    if (imagePublicId) {
      void (async () => {
        try {
          await deleteCloudinaryImages([imagePublicId]);
        } catch (err) {
          console.error(`Error deleting Cloudinary image for category ${id}:`, err);
        }
      })();
    }

    await AuditLog.create({
      actorUserId: adminUserId,
      action: 'CATEGORY_DEACTIVATE',
      entityType: 'Category',
      entityId: id,
      metadata: { name: existing.name },
    });

    void realtimeEventBus.publishCategoryDeleted({
      categoryId: id,
      action: 'DELETED',
      name: existing.name,
      slug: existing.slug,
      timestamp: new Date().toISOString(),
    });

    return deactivated;
  },
};
