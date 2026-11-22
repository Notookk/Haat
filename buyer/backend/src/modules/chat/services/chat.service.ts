import {
  ChatMessage,
  SellerProfile,
  AppError,
} from '@haat/shared-backend';

export interface SaveMessageInput {
  sellerSlug: string;
  sellerName?: string;
  buyerName?: string;
  buyerId?: string | null;
  sender: 'BUYER' | 'SELLER';
  text: string;
  productId?: string | null;
  productTitle?: string | null;
  productImage?: string | null;
  productPricePaise?: number | null;
}

export async function getChatMessages(sellerSlug: string, limit = 50) {
  return ChatMessage.find({ sellerSlug: sellerSlug.toLowerCase() })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

export async function saveMessage(data: SaveMessageInput) {
  if (!data.text || !data.text.trim()) {
    throw AppError.badRequest('Message text is required.');
  }

  let sellerName = data.sellerName;
  if (!sellerName) {
    const seller = await SellerProfile.findOne({ storeSlug: data.sellerSlug.toLowerCase() }).lean();
    sellerName = seller?.storeName || 'Merchant Store';
  }

  const message = await ChatMessage.create({
    sellerSlug: data.sellerSlug.toLowerCase().trim(),
    sellerName: sellerName.trim(),
    buyerName: (data.buyerName || 'Customer').trim(),
    buyerId: data.buyerId ? String(data.buyerId) : null,
    sender: data.sender,
    text: data.text.trim(),
    productId: data.productId ? String(data.productId) : null,
    productTitle: data.productTitle ? String(data.productTitle) : null,
    productImage: data.productImage ? String(data.productImage) : null,
    productPricePaise: typeof data.productPricePaise === 'number' ? data.productPricePaise : null,
    isRead: false,
  });

  return message.toObject();
}

export async function listBuyerConversations(buyerId?: string | null) {
  // Aggregate recent messages by sellerSlug
  const filter: any = {};
  if (buyerId) {
    filter.$or = [{ buyerId }, { buyerId: null }];
  }

  const slugs = await ChatMessage.distinct('sellerSlug', filter);
  const conversations = [];

  for (const slug of slugs) {
    const lastMsg = await ChatMessage.findOne({ sellerSlug: slug })
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = await ChatMessage.countDocuments({
      sellerSlug: slug,
      sender: 'SELLER',
      isRead: false,
    });

    if (lastMsg) {
      conversations.push({
        sellerSlug: slug,
        sellerName: lastMsg.sellerName || slug,
        lastMessage: lastMsg.text,
        lastMessageAt: lastMsg.createdAt,
        unreadCount,
      });
    }
  }

  return conversations.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export async function listSellerConversations(userId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only sellers can view seller conversations.');
  }

  const slug = seller.storeSlug.toLowerCase();
  const buyerNames = await ChatMessage.distinct('buyerName', { sellerSlug: slug });
  const conversations = [];

  for (const name of buyerNames) {
    const lastMsg = await ChatMessage.findOne({ sellerSlug: slug, buyerName: name })
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = await ChatMessage.countDocuments({
      sellerSlug: slug,
      buyerName: name,
      sender: 'BUYER',
      isRead: false,
    });

    if (lastMsg) {
      conversations.push({
        buyerName: name,
        buyerId: lastMsg.buyerId,
        sellerSlug: slug,
        lastMessage: lastMsg.text,
        lastMessageAt: lastMsg.createdAt,
        unreadCount,
      });
    }
  }

  return conversations.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export async function markChatRead(sellerSlug: string, readerRole: 'BUYER' | 'SELLER') {
  const senderToMark = readerRole === 'BUYER' ? 'SELLER' : 'BUYER';
  await ChatMessage.updateMany(
    { sellerSlug: sellerSlug.toLowerCase(), sender: senderToMark, isRead: false },
    { $set: { isRead: true } },
  );
  return { success: true };
}
