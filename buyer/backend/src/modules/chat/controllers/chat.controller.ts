import { asyncHandler, sendSuccess, HttpStatus, realtimeEventBus } from '@haat/shared-backend';
import {
  getChatMessages,
  saveMessage,
  listBuyerConversations,
  listSellerConversations,
  markChatRead,
} from '../services/chat.service';

export const getChatMessagesHandler = asyncHandler(async (req, res) => {
  const sellerSlug = String(req.params.sellerSlug || req.query.seller || 'abcd-store');
  const messages = await getChatMessages(sellerSlug);
  return sendSuccess(res, { messages });
});

export const sendMessageHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user?.id || null;
  const message = await saveMessage({
    ...req.body,
    sellerSlug: req.params.sellerSlug || req.body.sellerSlug,
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

export const markChatReadHandler = asyncHandler(async (req, res) => {
  const sellerSlug = req.params.sellerSlug;
  const readerRole = req.user?.role === 'SELLER' ? 'SELLER' : 'BUYER';
  const result = await markChatRead(sellerSlug, readerRole);
  return sendSuccess(res, result);
});
