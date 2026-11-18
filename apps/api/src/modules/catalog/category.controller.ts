import type { CategoryCreateInput } from '@haat/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { HttpStatus, sendSuccess } from '../../lib/http';
import { AppError } from '../../lib/AppError';
import { createCategory, getCategoryTree } from './category.service';

export const listCategoryTreeHandler = asyncHandler(async (_req, res) => {
  const tree = await getCategoryTree();
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return sendSuccess(res, { categories: tree });
});

export const createCategoryHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const category = await createCategory(req.body as CategoryCreateInput, req.user.id);
  return sendSuccess(res, { category }, HttpStatus.CREATED);
});
