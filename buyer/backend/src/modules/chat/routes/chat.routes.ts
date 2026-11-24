import { Router } from 'express';
import { requireAuth } from '@haat/shared-backend';
import {
  getChatMessagesHandler,
  sendMessageHandler,
  listBuyerConversationsHandler,
  listSellerConversationsHandler,
  getUnreadChatCountHandler,
  markQuoteOrderedHandler,
  markChatReadHandler,
  blockConversationHandler,
  unblockConversationHandler,
  deleteConversationsHandler,
  deleteMessagesHandler,
} from '../controllers/chat.controller';

export const chatRouter = Router();

// Public / Buyer chat routes
chatRouter.get('/unread-count', requireAuth, getUnreadChatCountHandler);
chatRouter.post('/quote/order', requireAuth, markQuoteOrderedHandler);
chatRouter.get('/conversations', listBuyerConversationsHandler);
chatRouter.delete('/conversations', deleteConversationsHandler);
chatRouter.delete('/messages', deleteMessagesHandler);
chatRouter.post('/block', blockConversationHandler);
chatRouter.post('/unblock', unblockConversationHandler);
chatRouter.get('/:sellerSlug/messages', getChatMessagesHandler);
chatRouter.post('/:sellerSlug/messages', sendMessageHandler);
chatRouter.post('/:sellerSlug/read', markChatReadHandler);

// Seller chat routes
export const sellerChatRouter = Router();
sellerChatRouter.use(requireAuth);
sellerChatRouter.get('/unread-count', getUnreadChatCountHandler);
sellerChatRouter.get('/conversations', listSellerConversationsHandler);
sellerChatRouter.delete('/conversations', deleteConversationsHandler);
sellerChatRouter.delete('/messages', deleteMessagesHandler);
sellerChatRouter.post('/block', blockConversationHandler);
sellerChatRouter.post('/unblock', unblockConversationHandler);
sellerChatRouter.get('/:sellerSlug/messages', getChatMessagesHandler);
sellerChatRouter.post('/:sellerSlug/messages', sendMessageHandler);
sellerChatRouter.post('/:sellerSlug/read', markChatReadHandler);
