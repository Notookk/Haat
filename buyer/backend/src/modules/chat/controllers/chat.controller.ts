import { asyncHandler, sendSuccess, HttpStatus, realtimeEventBus, AppError } from '@haat/shared-backend';
import {
  getChatMessages,
  saveMessage,
  listBuyerConversations,
  listSellerConversations,
  markChatRead,
  getUnreadChatCount,
  blockConversation,
  unblockConversation,
  deleteConversations,
  deleteMessages,
} from '../services/chat.service';

export const getChatMessagesHandler = asyncHandler(async (req, res) => {
  const sellerSlug = String(req.params.sellerSlug || req.query.seller || '').toLowerCase().trim();
  if (!sellerSlug) {
    throw AppError.badRequest('sellerSlug is required');
  }
  const buyerId = req.user?.id || (req.query.buyerId ? String(req.query.buyerId) : null);
  const buyerName = req.query.buyerName ? String(req.query.buyerName) : null;
  const result = await getChatMessages(sellerSlug, buyerId, buyerName);
  return sendSuccess(res, result);
});

export const sendMessageHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user?.id || req.body.buyerId || null;
  const sellerSlug = req.params.sellerSlug || req.body.sellerSlug;
  const message = await saveMessage({
    ...req.body,
    sellerSlug,
    buyerId,
    sender: req.user?.role === 'SELLER' ? 'SELLER' : 'BUYER',
  });
  // Broadcast instantly to connected clients on both buyer and seller backends
  void realtimeEventBus.publishChatMessage(message);
  return sendSuccess(res, { message }, HttpStatus.CREATED);
});

export const listBuyerConversationsHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user?.id || null;
  const conversations = await listBuyerConversations(buyerId);
  return sendSuccess(res, { conversations });
});

export const listSellerConversationsHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const conversations = await listSellerConversations(userId);
  return sendSuccess(res, { conversations });
});

export const getUnreadChatCountHandler = asyncHandler(async (req, res) => {
  const role = req.user?.role === 'SELLER' ? 'SELLER' : 'BUYER';
  const userId = req.user?.id || null;
  const result = await getUnreadChatCount(role, userId);
  return sendSuccess(res, result);
});

export const markQuoteOrderedHandler = asyncHandler(async (req, res) => {
  const { messageIds } = req.body ?? {};
  if (Array.isArray(messageIds) && messageIds.length > 0) {
    const { ChatMessage } = await import('@haat/shared-backend');
    await ChatMessage.updateMany(
      { _id: { $in: messageIds } },
      { $set: { quoteStatus: 'ORDERED' } },
    );
  }
  return sendSuccess(res, { success: true });
});

export const markChatReadHandler = asyncHandler(async (req, res) => {
  const sellerSlug = req.params.sellerSlug || req.body.sellerSlug;
  const readerRole = req.user?.role === 'SELLER' ? 'SELLER' : 'BUYER';
  const buyerName = req.body.buyerName || null;
  const buyerId = req.body.buyerId || null;
  const result = await markChatRead(sellerSlug, readerRole, buyerName, buyerId);
  return sendSuccess(res, result);
});

export const blockConversationHandler = asyncHandler(async (req, res) => {
  const { sellerSlug, buyerId, buyerName, reason } = req.body ?? {};
  if (!sellerSlug) {
    throw AppError.badRequest('sellerSlug is required to block conversation');
  }
  const blockedBy = req.user?.role === 'SELLER' ? 'SELLER' : 'BUYER';
  const result = await blockConversation({
    sellerSlug,
    buyerId: buyerId || (req.user?.role === 'BUYER' ? req.user.id : null),
    buyerName,
    blockedBy,
    reason,
  });
  return sendSuccess(res, result);
});

export const unblockConversationHandler = asyncHandler(async (req, res) => {
  const { sellerSlug, buyerId, buyerName } = req.body ?? {};
  if (!sellerSlug) {
    throw AppError.badRequest('sellerSlug is required to unblock conversation');
  }
  const result = await unblockConversation({
    sellerSlug,
    buyerId: buyerId || (req.user?.role === 'BUYER' ? req.user.id : null),
    buyerName,
  });
  return sendSuccess(res, result);
});

export const deleteConversationsHandler = asyncHandler(async (req, res) => {
  const conversations = Array.isArray(req.body.conversations)
    ? req.body.conversations
    : req.body.sellerSlug
      ? [{ sellerSlug: req.body.sellerSlug, buyerId: req.body.buyerId, buyerName: req.body.buyerName }]
      : [];

  if (conversations.length === 0) {
    throw AppError.badRequest('No conversations specified for deletion');
  }

  const result = await deleteConversations(conversations);
  return sendSuccess(res, result);
});


export const deleteMessagesHandler = asyncHandler(async (req, res) => {
  const messageIds: string[] = Array.isArray(req.body.messageIds)
    ? req.body.messageIds
    : req.body.messageId
      ? [req.body.messageId]
      : [];

  if (messageIds.length === 0) {
    throw AppError.badRequest('No messageIds specified for deletion');
  }

  const result = await deleteMessages(messageIds);
  return sendSuccess(res, result);
});
