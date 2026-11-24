import {
  ChatMessage,
  ChatConversation,
  SellerProfile,
  User,
  AppError,
  realtimeEventBus,
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
  isQuote?: boolean;
  quotePricePaise?: number | null;
  quoteQuantity?: number | null;
  quoteTotalPricePaise?: number | null;
  quoteNotes?: string | null;
  quoteStatus?: 'OFFERED' | 'ACCEPTED' | 'EXPIRED';
}

export async function getChatMessages(
  sellerSlug: string,
  buyerId?: string | null,
  buyerName?: string | null,
  limit = 100,
) {
  const slug = sellerSlug.toLowerCase().trim();
  const filter: any = {
    sellerSlug: slug,
    deletedForBuyer: { $ne: true },
  };
  if (buyerId) {
    filter.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
  } else if (buyerName) {
    filter.buyerName = buyerName;
  }

  const messages = await ChatMessage.find(filter)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  // Also check conversation status (e.g. isBlocked)
  const convFilter: any = { sellerSlug: slug };
  if (buyerId) {
    convFilter.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
  } else if (buyerName) {
    convFilter.buyerName = buyerName;
  }
  const conversation = await ChatConversation.findOne(convFilter).lean();

  return {
    messages,
    conversation: conversation || {
      sellerSlug: slug,
      sellerName: messages[0]?.sellerName || slug,
      isBlocked: false,
      blockedBy: null,
      blockedReason: null,
    },
  };
}

export async function saveMessage(data: SaveMessageInput) {
  if (!data.text || !data.text.trim()) {
    throw AppError.badRequest('Message text is required.');
  }

  const slug = data.sellerSlug.toLowerCase().trim();

  // Check if conversation is blocked
  const convFilter: any = { sellerSlug: slug };
  if (data.buyerId) {
    convFilter.$or = [{ buyerId: String(data.buyerId) }, { buyerId: null }];
  } else if (data.buyerName) {
    convFilter.buyerName = data.buyerName;
  }
  const existingConv = await ChatConversation.findOne(convFilter).lean();
  if (existingConv?.isBlocked) {
    throw AppError.forbidden('This conversation has been blocked. Messaging is disabled.');
  }

  let sellerName = data.sellerName;
  if (!sellerName) {
    const seller = await SellerProfile.findOne({ storeSlug: slug }).lean();
    sellerName = seller?.storeName || 'Merchant Store';
  }

  const message = await ChatMessage.create({
    sellerSlug: slug,
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
    isQuote: Boolean(data.isQuote),
    quotePricePaise: typeof data.quotePricePaise === 'number' ? data.quotePricePaise : null,
    quoteQuantity: typeof data.quoteQuantity === 'number' ? data.quoteQuantity : null,
    quoteTotalPricePaise: typeof data.quoteTotalPricePaise === 'number' ? data.quoteTotalPricePaise : null,
    quoteNotes: data.quoteNotes ? String(data.quoteNotes).trim() : null,
    quoteStatus: data.quoteStatus || (data.isQuote ? 'OFFERED' : undefined),
  });

  // Upsert the conversation tracker
  await ChatConversation.findOneAndUpdate(
    {
      sellerSlug: slug,
      ...(data.buyerId ? { buyerId: String(data.buyerId) } : { buyerName: (data.buyerName || 'Customer').trim() }),
    },
    {
      $set: {
        sellerSlug: slug,
        sellerName: sellerName.trim(),
        buyerName: (data.buyerName || 'Customer').trim(),
        buyerId: data.buyerId ? String(data.buyerId) : null,
        lastMessage: data.text.trim(),
        lastMessageAt: new Date(),
      },
      $setOnInsert: {
        isBlocked: false,
        blockedBy: null,
        blockedReason: null,
      },
    },
    { upsert: true, new: true },
  );

  return message.toObject();
}

export async function listBuyerConversations(buyerId?: string | null) {
  // Query only real ChatConversation records
  const filter: any = {};
  if (buyerId) {
    filter.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
  }

  const convs = await ChatConversation.find(filter).sort({ lastMessageAt: -1 }).lean();

  // If no conversations found in ChatConversation, check ChatMessage distinct slugs for backward compatibility
  if (convs.length === 0) {
    const msgFilter: any = { deletedForBuyer: { $ne: true } };
    if (buyerId) msgFilter.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
    const slugs = await ChatMessage.distinct('sellerSlug', msgFilter);
    const fallbackList = [];
    for (const slug of slugs) {
      const lastMsg = await ChatMessage.findOne({ sellerSlug: slug, deletedForBuyer: { $ne: true } }).sort({ createdAt: -1 }).lean();
      if (lastMsg) {
        const unreadCount = await ChatMessage.countDocuments({
          sellerSlug: slug,
          sender: 'SELLER',
          isRead: false,
          deletedForBuyer: { $ne: true },
        });
        fallbackList.push({
          sellerSlug: slug,
          sellerName: lastMsg.sellerName || slug,
          buyerName: lastMsg.buyerName || 'Customer',
          buyerId: lastMsg.buyerId || null,
          lastMessage: lastMsg.text,
          lastMessageAt: lastMsg.createdAt,
          unreadCount,
          isBlocked: false,
          blockedBy: null,
          blockedReason: null,
        });
      }
    }
    return fallbackList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  // Calculate unread counts for each real conversation
  const result = [];
  for (const conv of convs) {
    const latestVisible = await ChatMessage.findOne({
      sellerSlug: conv.sellerSlug,
      deletedForBuyer: { $ne: true },
    }).sort({ createdAt: -1 }).lean();

    // If no message left for buyer, don't show conversation in list
    if (!latestVisible) continue;

    const unreadCount = await ChatMessage.countDocuments({
      sellerSlug: conv.sellerSlug,
      sender: 'SELLER',
      isRead: false,
      deletedForBuyer: { $ne: true },
    });
    result.push({
      sellerSlug: conv.sellerSlug,
      sellerName: conv.sellerName || conv.sellerSlug,
      buyerName: conv.buyerName || 'Customer',
      buyerId: conv.buyerId || null,
      lastMessage: latestVisible.text,
      lastMessageAt: (latestVisible as any)?.createdAt || conv.lastMessageAt || (conv as any).updatedAt,
      unreadCount,
      isBlocked: Boolean(conv.isBlocked),
      blockedBy: conv.blockedBy || null,
      blockedReason: conv.blockedReason || null,
    });
  }

  return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function listSellerConversations(userId: string) {
  const seller = await SellerProfile.findOne({ userId }).lean();
  if (!seller) {
    throw AppError.forbidden('Only sellers can view seller conversations.');
  }

  const slug = seller.storeSlug.toLowerCase().trim();
  const convs = await ChatConversation.find({ sellerSlug: slug }).sort({ lastMessageAt: -1 }).lean();

  if (convs.length === 0) {
    const buyerNames = await ChatMessage.distinct('buyerName', { sellerSlug: slug });
    const fallbackList = [];
    for (const name of buyerNames) {
      const lastMsg = await ChatMessage.findOne({ sellerSlug: slug, buyerName: name }).sort({ createdAt: -1 }).lean();
      if (lastMsg) {
        const unreadCount = await ChatMessage.countDocuments({
          sellerSlug: slug,
          buyerName: name,
          sender: 'BUYER',
          isRead: false,
        });
        fallbackList.push({
          buyerName: name,
          buyerId: lastMsg.buyerId || null,
          sellerSlug: slug,
          sellerName: seller.storeName,
          lastMessage: lastMsg.text,
          lastMessageAt: lastMsg.createdAt,
          unreadCount,
          isBlocked: false,
          blockedBy: null,
          blockedReason: null,
        });
      }
    }
    return fallbackList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  const result = [];
  for (const conv of convs) {
    const buyerConditions: any[] = [{ buyerName: conv.buyerName }];
    if (conv.buyerId) buyerConditions.push({ buyerId: String(conv.buyerId) });
    const latestVisible = await ChatMessage.findOne({
      sellerSlug: slug,
      deletedForSeller: { $ne: true },
      $or: buyerConditions,
    }).sort({ createdAt: -1 }).lean();

    // If no message left for seller, don't show conversation in list
    if (!latestVisible) continue;

    const unreadCount = await ChatMessage.countDocuments({
      sellerSlug: slug,
      sender: 'BUYER',
      isRead: false,
      deletedForSeller: { $ne: true },
      $or: buyerConditions,
    });
    result.push({
      buyerName: conv.buyerName,
      buyerId: conv.buyerId || null,
      sellerSlug: slug,
      sellerName: seller.storeName,
      lastMessage: latestVisible.text,
      lastMessageAt: (latestVisible as any)?.createdAt || conv.lastMessageAt || (conv as any).updatedAt,
      unreadCount,
      isBlocked: Boolean(conv.isBlocked),
      blockedBy: conv.blockedBy || null,
      blockedReason: conv.blockedReason || null,
    });
  }

  return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function getUnreadChatCount(role: 'BUYER' | 'SELLER', userId?: string | null, storeSlug?: string | null) {
  if (role === 'BUYER') {
    const filter: any = { sender: 'SELLER', isRead: false, deletedForBuyer: { $ne: true } };
    if (userId) {
      const user = await User.findById(userId).lean();
      const conditions: any[] = [{ buyerId: String(userId) }, { buyerId: null }];
      if (user?.fullName) {
        conditions.push({ buyerName: user.fullName });
      }
      filter.$or = conditions;
    }
    const count = await ChatMessage.countDocuments(filter);
    return { unreadCount: count };
  } else {
    let slug = storeSlug;
    if (!slug && userId) {
      const seller = await SellerProfile.findOne({ userId }).lean();
      slug = seller?.storeSlug;
    }
    if (!slug) return { unreadCount: 0 };
    const count = await ChatMessage.countDocuments({
      sellerSlug: slug.toLowerCase().trim(),
      sender: 'BUYER',
      isRead: false,
      deletedForSeller: { $ne: true },
    });
    return { unreadCount: count };
  }
}

export async function markChatRead(
  sellerSlug: string,
  readerRole: 'BUYER' | 'SELLER',
  buyerName?: string | null,
  buyerId?: string | null,
) {
  const senderToMark = readerRole === 'BUYER' ? 'SELLER' : 'BUYER';
  const filter: any = {
    sellerSlug: sellerSlug.toLowerCase().trim(),
    sender: senderToMark,
    isRead: false,
  };
  if (readerRole === 'SELLER') {
    const conditions: any[] = [];
    if (buyerId) conditions.push({ buyerId: String(buyerId) });
    if (buyerName) {
      const trimmed = String(buyerName).trim();
      conditions.push({ buyerName: trimmed });
      conditions.push({
        buyerName: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
    }
    if (conditions.length > 0) {
      filter.$or = conditions;
    }
  }
  await ChatMessage.updateMany(filter, { $set: { isRead: true } });
  return { success: true };
}

export async function blockConversation(input: {
  sellerSlug: string;
  sellerName?: string;
  buyerId?: string | null;
  buyerName?: string | null;
  blockedBy: 'BUYER' | 'SELLER';
  reason?: string | null;
}) {
  const slug = input.sellerSlug.toLowerCase().trim();
  const query: any = { sellerSlug: slug };
  if (input.buyerId) {
    query.$or = [{ buyerId: String(input.buyerId) }, { buyerId: null }];
  } else if (input.buyerName) {
    query.buyerName = input.buyerName;
  }

  const updated = await ChatConversation.findOneAndUpdate(
    query,
    {
      $set: {
        isBlocked: true,
        blockedBy: input.blockedBy,
        blockedReason: input.reason || null,
        ...(input.sellerName ? { sellerName: input.sellerName } : {}),
        ...(input.buyerName ? { buyerName: input.buyerName } : {}),
        ...(input.buyerId ? { buyerId: String(input.buyerId) } : {}),
      },
    },
    { upsert: true, new: true },
  );

  void realtimeEventBus.publishChatBlocked({
    sellerSlug: slug,
    buyerId: input.buyerId || null,
    buyerName: input.buyerName || null,
    blockedBy: input.blockedBy,
    reason: input.reason || null,
    timestamp: new Date().toISOString(),
  });

  return { success: true, conversation: updated.toObject() };
}

export async function unblockConversation(input: {
  sellerSlug: string;
  buyerId?: string | null;
  buyerName?: string | null;
}) {
  const slug = input.sellerSlug.toLowerCase().trim();
  const query: any = { sellerSlug: slug };
  if (input.buyerId) {
    query.$or = [{ buyerId: String(input.buyerId) }, { buyerId: null }];
  } else if (input.buyerName) {
    query.buyerName = input.buyerName;
  }

  const updated = await ChatConversation.findOneAndUpdate(
    query,
    {
      $set: {
        isBlocked: false,
        blockedBy: null,
        blockedReason: null,
      },
    },
    { new: true },
  );

  void realtimeEventBus.publishChatUnblocked({
    sellerSlug: slug,
    buyerId: input.buyerId || null,
    buyerName: input.buyerName || null,
    timestamp: new Date().toISOString(),
  });

  return { success: true, conversation: updated ? updated.toObject() : null };
}

export async function deleteConversations(
  conversations: Array<{ sellerSlug: string; buyerId?: string | null; buyerName?: string | null }>,
) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    throw AppError.badRequest('At least one conversation is required to delete.');
  }

  for (const item of conversations) {
    const slug = (item.sellerSlug || '').toLowerCase().trim();
    if (!slug) continue;

    const msgFilter: any = { sellerSlug: slug };
    const convFilter: any = { sellerSlug: slug };

    if (item.buyerId) {
      msgFilter.$or = [{ buyerId: String(item.buyerId) }, { buyerId: null }];
      convFilter.$or = [{ buyerId: String(item.buyerId) }, { buyerId: null }];
    } else if (item.buyerName) {
      msgFilter.buyerName = item.buyerName;
      convFilter.buyerName = item.buyerName;
    }

    // Delete completely from MongoDB collections
    await ChatMessage.deleteMany(msgFilter);
    await ChatConversation.deleteMany(convFilter);
  }

  void realtimeEventBus.publishChatDeleted({
    deletedConversations: conversations.map((c) => ({
      sellerSlug: c.sellerSlug.toLowerCase().trim(),
      buyerId: c.buyerId || null,
    })),
    timestamp: new Date().toISOString(),
  });

  return { success: true, count: conversations.length };
}


export async function deleteMessages(messageIds: string[]) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw AppError.badRequest('At least one messageId is required.');
  }

  const messagesToDelete = await ChatMessage.find({ _id: { $in: messageIds } }).lean();
  if (messagesToDelete.length === 0) {
    return { success: true, count: 0 };
  }

  // Mark matching messages as deleted for buyer only (does not delete from seller view)
  await ChatMessage.updateMany({ _id: { $in: messageIds } }, { $set: { deletedForBuyer: true } });

  // If already deleted by seller, clean up from database completely
  await ChatMessage.deleteMany({
    _id: { $in: messageIds },
    deletedForBuyer: true,
    deletedForSeller: true,
  });

  // Update conversation lastMessage for affected conversations
  const convKeys = new Set<string>();
  for (const msg of messagesToDelete) {
    const key = `${msg.sellerSlug}_${msg.buyerId || msg.buyerName}`;
    if (!convKeys.has(key)) {
      convKeys.add(key);
      const filter: any = {
        sellerSlug: msg.sellerSlug,
        deletedForBuyer: { $ne: true },
      };
      if (msg.buyerId) filter.$or = [{ buyerId: String(msg.buyerId) }, { buyerId: null }];
      else if (msg.buyerName) filter.buyerName = msg.buyerName;

      const latest = await ChatMessage.findOne(filter).sort({ createdAt: -1 }).lean();
      if (latest) {
        await ChatConversation.updateOne(
          {
            sellerSlug: msg.sellerSlug,
            ...(msg.buyerId ? { $or: [{ buyerId: String(msg.buyerId) }, { buyerId: null }] } : { buyerName: msg.buyerName }),
          },
          {
            lastMessage: latest.text,
            lastMessageAt: (latest as any).createdAt,
          },
        );
      }
    }
  }

  return { success: true, count: messagesToDelete.length };
}
