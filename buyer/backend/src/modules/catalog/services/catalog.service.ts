import mongoose, { type FilterQuery, type SortOrder } from 'mongoose';
import type { ProductQueryInput } from '@haat/shared-contracts';
import { AppError, pageMeta, pageRequest, type ProductAttributes } from '@haat/shared-backend';
import { categorySubtreeIds, getCategoryTree } from '../../categories/services/category.service';
import { toProductView, type ProductView } from '../catalog.dto';
import { catalogModel } from '../models/catalog.model';

function sortFor(sort: ProductQueryInput['sort']): Record<string, SortOrder> {
  switch (sort) {
    case 'price-asc':
      return { retailPricePaise: 1, _id: 1 };
    case 'price-desc':
      return { retailPricePaise: -1, _id: 1 };
    default:
      return { createdAt: -1, _id: 1 };
  }
}

export async function listPublicProducts(
  query: ProductQueryInput,
): Promise<{ items: ProductView[]; meta: ReturnType<typeof pageMeta> }> {
  const page = pageRequest(query);

  const filter: FilterQuery<ProductAttributes> = { isActive: true, isApproved: true, sellerStatus: 'ACTIVE' };
  if (query.q) filter.$text = mongoose.trusted({ $search: query.q });
  if (query.seller) filter.sellerSlug = query.seller;
  if (query.category) {
    const subtree = await categorySubtreeIds(query.category);
    if (!subtree) return { items: [], meta: pageMeta(page, 0) };
    filter.categoryId = mongoose.trusted({
      $in: subtree.ids.map((id: string) => new mongoose.Types.ObjectId(id)),
    });
  }

  const [rows, total] = await Promise.all([
    catalogModel.findPublicProducts(filter, sortFor(query.sort), page.skip, page.limit),
    catalogModel.countPublicProducts(filter),
  ]);

  return { items: rows.map(toProductView), meta: pageMeta(page, total) };
}

export async function getPublicProductBySlug(slug: string): Promise<ProductView> {
  const product = await catalogModel.findPublicProductBySlug(slug);
  if (!product) throw AppError.notFound('Product not found.');
  return toProductView(product);
}

export { getCategoryTree };
