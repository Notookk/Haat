import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from '@haat/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { HttpStatus, sendSuccess } from '../../lib/http';
import { AppError } from '../../lib/AppError';
import {
  archiveProduct,
  createProduct,
  getMyProduct,
  getPublicProductBySlug,
  listMyProducts,
  listPublicProducts,
  updateProduct,
} from './product.service';

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

export const listMyProductsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const { items, meta } = await listMyProducts(req.user.id, req.query as unknown as ProductQueryInput);
  return sendSuccess(res, { items }, 200, meta);
});

export const getMyProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await getMyProduct(req.user.id, req.params.id);
  return sendSuccess(res, { product });
});

export const listPublicProductsHandler = asyncHandler(async (req, res) => {
  const { items, meta } = await listPublicProducts(req.query as unknown as ProductQueryInput);
  return sendSuccess(res, { items }, 200, meta);
});

export const getPublicProductHandler = asyncHandler(async (req, res) => {
  const product = await getPublicProductBySlug(req.params.slug);
  return sendSuccess(res, { product });
});
