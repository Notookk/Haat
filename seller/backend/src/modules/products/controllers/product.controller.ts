import type { Request, Response } from 'express';
import { z } from 'zod';
import type { CreateProductInput, UpdateProductInput } from '@haat/shared-contracts';
import { AppError, asyncHandler, HttpStatus, sendSuccess } from '@haat/shared-backend';
import { sellerProductService, type SellerProductQuery } from '../services/product.service';

const adjustStockSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(0),
});

export const listMyProductsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const query: SellerProductQuery = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    sort: req.query.sort as SellerProductQuery['sort'],
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
  };
  const { items, meta } = await sellerProductService.listMyProducts(req.user.id, query);
  return sendSuccess(res, { items }, HttpStatus.OK, meta);
});

export const getMyProductHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await sellerProductService.getMyProduct(req.user.id, req.params.id);
  return sendSuccess(res, { product });
});

export const createProductHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await sellerProductService.createProduct(req.user.id, req.body as CreateProductInput);
  return sendSuccess(res, { product }, HttpStatus.CREATED);
});

export const updateProductHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await sellerProductService.updateProduct(req.user.id, req.params.id, req.body as UpdateProductInput);
  return sendSuccess(res, { product });
});

export const archiveProductHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const product = await sellerProductService.archiveProduct(req.user.id, req.params.id);
  return sendSuccess(res, { product });
});

export const adjustStockHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const parsed = adjustStockSchema.parse(req.body);
  const product = await sellerProductService.adjustStock(req.user.id, req.params.id, parsed.variantId, parsed.quantity);
  return sendSuccess(res, { product });
});
