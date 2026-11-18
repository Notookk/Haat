import type { CategoryCreateInput } from '@haat/shared';
import { AppError } from '../../lib/AppError';
import { AuditLog, Category } from '../../models';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  displayOrder: number;
  productCount: number;
  children: CategoryNode[];
}

interface CategoryLike {
  _id: unknown;
  name: string;
  slug: string;
  path: string;
  depth: number;
  displayOrder: number;
  productCount: number;
}

export function toCategoryNode(category: CategoryLike): CategoryNode {
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    path: category.path,
    depth: category.depth,
    displayOrder: category.displayOrder,
    productCount: category.productCount,
    children: [],
  };
}

/** Assembles the full active tree in one query — the catalogue is small and cached at the edge. */
export async function getCategoryTree(includeInactive = false): Promise<CategoryNode[]> {
  const filter = includeInactive ? {} : { isActive: true };
  const rows = await Category.find(filter).sort({ depth: 1, displayOrder: 1, name: 1 }).lean();

  const byId = new Map<string, CategoryNode>();
  for (const row of rows) byId.set(String(row._id), toCategoryNode(row));

  const roots: CategoryNode[] = [];
  for (const row of rows) {
    const node = byId.get(String(row._id));
    if (!node) continue;
    const parent = row.parentId ? byId.get(String(row.parentId)) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

/** IDs of a category and every descendant, resolved in JS to avoid operator filters. */
export async function categorySubtreeIds(slug: string): Promise<{ id: string; ids: string[] } | null> {
  const rows = await Category.find({ isActive: true }).select('_id slug path').lean();
  const target = rows.find((row) => row.slug === slug);
  if (!target) return null;
  const prefix = `${target.path}/`;
  const ids = rows
    .filter((row) => String(row._id) === String(target._id) || row.path.startsWith(prefix))
    .map((row) => String(row._id));
  return { id: String(target._id), ids };
}

export async function createCategory(input: CategoryCreateInput, actorUserId: string): Promise<CategoryNode> {
  let parentPath: string | null = null;
  let depth = 0;

  if (input.parentId) {
    const parent = await Category.findById(input.parentId).lean();
    if (!parent) throw AppError.badRequest('The selected parent category does not exist.');
    if (parent.depth >= 3) throw AppError.badRequest('The category tree is limited to four levels.');
    parentPath = parent.path;
    depth = parent.depth + 1;
  }

  const path = parentPath ? `${parentPath}/${input.slug}` : input.slug;

  const clash = await Category.findOne({ $or: [{ slug: input.slug }, { path }] }).select('_id').lean();
  if (clash) throw AppError.conflict('A category with this name or path already exists.');

  const created = await Category.create({
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    parentId: input.parentId ?? null,
    path,
    depth,
    displayOrder: input.displayOrder,
    isActive: true,
  });

  await AuditLog.create({
    actorUserId,
    action: 'CATEGORY_CREATE',
    entityType: 'Category',
    entityId: String(created._id),
    metadata: { name: created.name, path: created.path },
  });

  return toCategoryNode(created.toObject());
}
