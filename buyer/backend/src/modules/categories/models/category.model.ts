import { AuditLog, Category } from '@haat/shared-backend';

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  path: string;
  depth: number;
  displayOrder: number;
  isActive: boolean;
}

export const categoryModel = {
  async findAll(filter: Record<string, unknown> = {}) {
    return Category.find(filter).sort({ depth: 1, displayOrder: 1, name: 1 }).lean();
  },

  async findActiveSubtreeData() {
    return Category.find({ isActive: true }).select('_id slug path').lean();
  },

  async findById(id: string) {
    return Category.findById(id).lean();
  },

  async findClash(slug: string, path: string) {
    return Category.findOne({ $or: [{ slug }, { path }] })
      .select('_id')
      .lean();
  },

  async create(data: CreateCategoryData) {
    return Category.create(data);
  },

  async logAudit(actorUserId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
    return AuditLog.create({
      actorUserId,
      action,
      entityType: 'Category',
      entityId,
      metadata,
    });
  },
};
