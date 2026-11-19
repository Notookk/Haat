import type { CategoryCreateInput } from '@haat/shared-contracts';
import { AppError } from '@haat/shared-backend';
import { categoryModel } from '../models/category.model';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  displayOrder: number;
  productCount: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
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
  imageUrl?: string | null;
  imagePublicId?: string | null;
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
    imageUrl: category.imageUrl ?? null,
    imagePublicId: category.imagePublicId ?? null,
    children: [],
  };
}

/** Assembles the full active tree in one query — the catalogue is small and cached at the edge. */
export async function getCategoryTree(includeInactive = false): Promise<CategoryNode[]> {
  const filter = includeInactive ? {} : { isActive: true };
  const rows = await categoryModel.findAll(filter);

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
  const rows = await categoryModel.findActiveSubtreeData();
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
    const parent = await categoryModel.findById(input.parentId);
    if (!parent) throw AppError.badRequest('The selected parent category does not exist.');
    if (parent.depth >= 3) throw AppError.badRequest('The category tree is limited to four levels.');
    parentPath = parent.path;
    depth = parent.depth + 1;
  }

  const path = parentPath ? `${parentPath}/${input.slug}` : input.slug;

  const clash = await categoryModel.findClash(input.slug, path);
  if (clash) throw AppError.conflict('A category with this name or path already exists.');

  const created = await categoryModel.create({
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    parentId: input.parentId ?? null,
    path,
    depth,
    displayOrder: input.displayOrder,
    isActive: true,
  });

  await categoryModel.logAudit(actorUserId, 'CATEGORY_CREATE', String(created._id), {
    name: created.name,
    path: created.path,
  });

  return toCategoryNode(created.toObject());
}
