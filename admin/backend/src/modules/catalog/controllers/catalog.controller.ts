import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import { adminCatalogService } from '../services/catalog.service';
import type { CatalogListQuery, ModerateProductInput } from '../validators/catalog.validator';

export const listProductsHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as CatalogListQuery;

  let isApproved: boolean | undefined = undefined;
  if (query.status === 'APPROVED') isApproved = true;
  if (query.status === 'SUSPENDED') isApproved = false;

  const result = await adminCatalogService.listProducts({
    search: query.search,
    categoryId: query.categoryId,
    sellerId: query.sellerId,
    isApproved,
    page: query.page,
    limit: query.limit,
  });

  return sendSuccess(res, result.products, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getProductHandler = asyncHandler(async (req, res) => {
  const product = await adminCatalogService.getProduct(req.params.id);
  return sendSuccess(res, { product });
});

export const moderateProductHandler = asyncHandler(async (req, res) => {
  const { isApproved, reason } = req.body as ModerateProductInput;
  const product = await adminCatalogService.moderateProduct({
    productId: req.params.id,
    isApproved,
    reason,
    adminUserId: req.user!.userId,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { product });
});

export const createProductHandler = asyncHandler(async (req, res) => {
  const product = await adminCatalogService.createProduct({
    ...req.body,
    adminUserId: req.user!.userId,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { product }, 201);
});

export const updateProductHandler = asyncHandler(async (req, res) => {
  const product = await adminCatalogService.updateProduct({
    productId: req.params.id,
    input: req.body,
    adminUserId: req.user!.userId,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { product });
});
