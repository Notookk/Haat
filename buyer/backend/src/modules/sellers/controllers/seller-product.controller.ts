import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from '@haat/shared-contracts';
import { AppError, asyncHandler, HttpStatus, sendSuccess } from '@haat/shared-backend';
import {
  archiveProduct,
  createProduct,
  getMyProduct,
  listMyProducts,
  updateProduct,
} from '../services/seller-product.service';

export const listMyProductsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const { items, meta } = await listMyProducts(req.user.id, (req.query ?? {}) as unknown as ProductQueryInput);
  return sendSuccess(res, { items }, HttpStatus.OK, meta);
});

export const getMyProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await getMyProduct(req.user.id, req.params.id);
  return sendSuccess(res, { product });
});

export const createProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await createProduct(req.user.id, req.body as CreateProductInput);
  return sendSuccess(res, { product }, HttpStatus.CREATED);
});

export const updateProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await updateProduct(req.user.id, req.params.id, req.body as UpdateProductInput);
  return sendSuccess(res, { product });
});

export const archiveProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await archiveProduct(req.user.id, req.params.id);
  return sendSuccess(res, { product });
});
