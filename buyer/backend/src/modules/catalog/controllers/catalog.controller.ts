import type { ProductQueryInput } from '@haat/shared-contracts';
import { asyncHandler, HttpStatus, sendSuccess } from '@haat/shared-backend';
import { getCategoryTree, getPublicProductBySlug, listPublicProducts } from '../services/catalog.service';

export const listPublicProductsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await listPublicProducts((req.query ?? {}) as unknown as ProductQueryInput);
  return sendSuccess(res, { items }, HttpStatus.OK, meta);
});

export const getPublicProductHandler = asyncHandler(async (req, res) => {
  const product = await getPublicProductBySlug(req.params.slug);
  return sendSuccess(res, { product });
});

export const listCategoryTreeHandler = asyncHandler(async (_req, res) => {
  const tree = await getCategoryTree();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return sendSuccess(res, { categories: tree });
});
