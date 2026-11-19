import { asyncHandler, HttpStatus, sendSuccess } from '@haat/shared-backend';
import { adminCategoryService } from '../services/category.service';
import type { AdminCategoryCreateInput, AdminCategoryUpdateInput } from '../validators/category.validator';

export const listCategoriesHandler = asyncHandler(async (_req, res) => {
  const categories = await adminCategoryService.listCategories();
  return sendSuccess(res, { categories });
});

export const getCategoryHandler = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.getCategory(req.params.id);
  return sendSuccess(res, { category });
});

export const createCategoryHandler = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.createCategory(req.body as AdminCategoryCreateInput, req.user!.userId);
  return sendSuccess(res, { category }, HttpStatus.CREATED);
});

export const updateCategoryHandler = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.updateCategory(
    req.params.id,
    req.body as AdminCategoryUpdateInput,
    req.user!.userId,
  );
  return sendSuccess(res, { category });
});

export const deleteCategoryHandler = asyncHandler(async (req, res) => {
  const category = await adminCategoryService.deleteCategory(req.params.id, req.user!.userId);
  return sendSuccess(res, { category });
});
