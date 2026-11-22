import { type Server, type Socket, logger } from '@haat/shared-backend';
import { saveMessage, markChatRead } from '../services/chat.service';

export function registerChatSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    // Join seller-specific chat room
    socket.on('join_chat', (data: { sellerSlug: string }) => {
      if (!data?.sellerSlug) return;
      const room = `chat:${data.sellerSlug.toLowerCase().trim()}`;
      void socket.join(room);
      logger.debug('Socket joined chat room', { socketId: socket.id, room });
    });

    // Leave chat room
    socket.on('leave_chat', (data: { sellerSlug: string }) => {
      if (!data?.sellerSlug) return;
      const room = `chat:${data.sellerSlug.toLowerCase().trim()}`;
      void socket.leave(room);
    });

    // Send real-time chat message (Persistence FIRST before broadcast)
    socket.on('send_message', async (data: any, callback?: (res: any) => void) => {
      try {
        if (!data?.sellerSlug || !data?.text) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'sellerSlug and text are required' });
          }
          return;
        }

        // 1. Persist to MongoDB
        const message = await saveMessage({
          sellerSlug: data.sellerSlug,
          sellerName: data.sellerName,
          buyerName: data.buyerName,
          buyerId: data.buyerId || socket.data?.user?.id || null,
          sender: data.sender || (socket.data?.user?.role === 'SELLER' ? 'SELLER' : 'BUYER'),
          text: data.text,
          productId: data.productId,
          productTitle: data.productTitle,
          productImage: data.productImage,
          productPricePaise: data.productPricePaise,
        });

        // 2. Broadcast to room
        const room = `chat:${data.sellerSlug.toLowerCase().trim()}`;
        io.to(room).emit('new_message', message);

        // 3. Acknowledge back to sender
        socket.emit('message_delivered', { messageId: message._id });

        if (typeof callback === 'function') {
          callback({ success: true, message });
        }
      } catch (err: any) {
        logger.error('Failed to handle send_message socket event', { err: String(err) });
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message || 'Internal chat error' });
        }
      }
    });

    // Typing indicator
    socket.on('typing', (data: { sellerSlug: string; userName?: string }) => {
      if (!data?.sellerSlug) return;
      const room = `chat:${data.sellerSlug.toLowerCase().trim()}`;
      socket.to(room).emit('user_typing', {
        userName: data.userName || 'Someone',
        sellerSlug: data.sellerSlug,
      });
    });

    // Mark messages read
    socket.on('mark_read', async (data: { sellerSlug: string; readerRole: 'BUYER' | 'SELLER' }) => {
      if (!data?.sellerSlug) return;
      await markChatRead(data.sellerSlug, data.readerRole || 'BUYER');
    });
  });
}
