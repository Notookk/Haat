import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import { adminSellerService } from '../services/seller.service';
import type {
  SellerListQuery,
  ApproveSellerInput,
  RejectSellerInput,
  BlockSellerInput,
  UnblockSellerInput,
} from '../validators/seller.validator';

export const getSellerStatsHandler = asyncHandler(async (_req, res) => {
  const stats = await adminSellerService.getSellerStats();
  return sendSuccess(res, stats);
});

export const listSellersHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as SellerListQuery;
  const result = await adminSellerService.listSellers({
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });
  return sendSuccess(res, result.sellers, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const getSellerHandler = asyncHandler(async (req, res) => {
  const seller = await adminSellerService.getSeller(req.params.id);
  return sendSuccess(res, { seller });
});

export const getSellerStatusHistoryHandler = asyncHandler(async (req, res) => {
  const history = await adminSellerService.getSellerStatusHistory(req.params.id);
  return sendSuccess(res, history);
});

export const getSellerAnalyticsHandler = asyncHandler(async (req, res) => {
  const analytics = await adminSellerService.getSellerAnalytics(req.params.id);
  return sendSuccess(res, analytics);
});

export const approveSellerHandler = asyncHandler(async (req, res) => {
  const { notes } = req.body as ApproveSellerInput;
  const seller = await adminSellerService.approveSeller({
    sellerId: req.params.id,
    notes,
    adminUserId: req.user!.userId,
    adminRole: req.user!.role,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { seller, message: 'Seller application approved successfully.' });
});

export const rejectSellerHandler = asyncHandler(async (req, res) => {
  const { reason } = req.body as RejectSellerInput;
  const seller = await adminSellerService.rejectSeller({
    sellerId: req.params.id,
    reason,
    adminUserId: req.user!.userId,
    adminRole: req.user!.role,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { seller, message: 'Seller application rejected.' });
});

export const blockSellerHandler = asyncHandler(async (req, res) => {
  const { reason } = req.body as BlockSellerInput;
  const seller = await adminSellerService.blockSeller({
    sellerId: req.params.id,
    reason,
    adminUserId: req.user!.userId,
    adminRole: req.user!.role,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { seller, message: 'Seller blocked platform-wide.' });
});

export const unblockSellerHandler = asyncHandler(async (req, res) => {
  const { reason } = (req.body || {}) as UnblockSellerInput;
  const seller = await adminSellerService.unblockSeller({
    sellerId: req.params.id,
    reason,
    adminUserId: req.user!.userId,
    adminRole: req.user!.role,
    ipAddress: req.ip,
  });
  return sendSuccess(res, { seller, message: 'Seller unblocked successfully.' });
});
