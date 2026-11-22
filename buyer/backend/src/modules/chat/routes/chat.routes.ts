import { Router } from 'express';
import { requireAuth } from '@haat/shared-backend';
import {
  getChatMessagesHandler,
  sendMessageHandler,
  listBuyerConversationsHandler,
  listSellerConversationsHandler,
  markChatReadHandler,
} from '../controllers/chat.controller';

export const chatRouter = Router();

// Public / Buyer chat routes
chatRouter.get('/conversations', listBuyerConversationsHandler);
chatRouter.get('/:sellerSlug/messages', getChatMessagesHandler);
chatRouter.post('/:sellerSlug/messages', sendMessageHandler);
chatRouter.post('/:sellerSlug/read', markChatReadHandler);

// Seller chat routes
export const sellerChatRouter = Router();
sellerChatRouter.use(requireAuth);
sellerChatRouter.get('/conversations', listSellerConversationsHandler);
sellerChatRouter.get('/:sellerSlug/messages', getChatMessagesHandler);
sellerChatRouter.post('/:sellerSlug/messages', sendMessageHandler);
sellerChatRouter.post('/:sellerSlug/read', markChatReadHandler);
