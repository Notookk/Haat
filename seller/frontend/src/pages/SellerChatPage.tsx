import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  ShoppingBag,
  RefreshCw,
  Search,
  CheckCircle2,
  Tag,
  Trash2,
  Ban,
  Unlock,
  AlertTriangle,
  Loader2,
  CheckCheck,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  api,
  money,
  showToast,
  showConfirm,
  createSocketClient,
} from '@haat/shared-frontend';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';

interface ChatMessage {
  _id?: string;
  sellerSlug: string;
  sellerName: string;
  buyerName: string;
  buyerId?: string | null;
  sender: 'BUYER' | 'SELLER';
  text: string;
  productId?: string | null;
  productTitle?: string | null;
  productImage?: string | null;
  productPricePaise?: number | null;
  isRead?: boolean;
  createdAt?: string;
  isQuote?: boolean;
  quotePricePaise?: number | null;
  quoteQuantity?: number | null;
  quoteTotalPricePaise?: number | null;
  quoteNotes?: string | null;
  quoteStatus?: 'OFFERED' | 'ACCEPTED' | 'EXPIRED';
}

interface ChatConversation {
  buyerName: string;
  buyerId?: string | null;
  sellerSlug: string;
  sellerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isBlocked?: boolean;
  blockedBy?: 'BUYER' | 'SELLER' | null;
  blockedReason?: string | null;
}

export function SellerChatPage() {
  const { seller } = useSellerAuth();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
  const [selectedChatKeys, setSelectedChatKeys] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // WhatsApp-Style Message Selection & Long-Press State
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const isSelectionMode = selectedMessageIds.length > 0;
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  // Clear timer and escape listener
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        setSelectedMessageIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [isSelectionMode]);

  const handlePointerDownMessage = (messageId?: string) => {
    if (!messageId) return;
    isLongPressTriggeredRef.current = false;
    if (isSelectionMode) return;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSelectedMessageIds([messageId]);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {}
      }
    }, 450);
  };

  const handlePointerUpMessage = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMessageClick = (messageId?: string) => {
    if (!messageId) return;
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    if (isSelectionMode) {
      setSelectedMessageIds((prev) =>
        prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
      );
    }
  };

  const handleContextMenuSelect = (messageId?: string) => {
    if (!messageId) return;
    if (!isSelectionMode) {
      setSelectedMessageIds([messageId]);
    } else {
      setSelectedMessageIds((prev) =>
        prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
      );
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;

    const count = selectedMessageIds.length;
    const confirmed = await showConfirm({
      title: count === 1 ? 'Delete message?' : `Delete ${count} messages?`,
      text:
        count === 1
          ? 'Are you sure you want to delete this message? It will be deleted from your view (the customer will still see it).'
          : `Are you sure you want to delete these ${count} messages? They will be deleted from your view (the customer will still see them).`,
      confirmButtonText: 'Delete for me',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete('/chat/messages', { messageIds: selectedMessageIds });
      showToast.success('Deleted', `${count} message(s) deleted from your chat.`);
      setSelectedMessageIds([]);
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
    } catch {
      showToast.error('Delete Failed', 'Unable to delete messages. Please try again.');
    }
  };

  // Fetch real conversations from backend (NO dummy data)
  const {
    data: convsData,
    isLoading: isConvsLoading,
    isRefetching: isConvsRefetching,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['seller', 'chat', 'conversations'],
    queryFn: async () => {
      const res = await api.get<{ conversations: ChatConversation[] }>('/chat/conversations');
      return res.data.conversations || [];
    },
    refetchInterval: 3000,
  });

  const conversations: ChatConversation[] = convsData || [];

  // Fetch all messages for this seller
  const {
    data: msgsData,
    isLoading: isMsgsLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['seller', 'chat', 'messages'],
    queryFn: async () => {
      const res = await api.get<{ messages: ChatMessage[] }>('/chat/messages');
      return res.data.messages || [];
    },
    refetchInterval: 3000,
  });

  const messages: ChatMessage[] = msgsData || [];

  // Group messages by buyer name
  const buyerGroups = useMemo(() => {
    return messages.reduce<Record<string, ChatMessage[]>>((acc, msg) => {
      const name = msg.buyerName || 'Customer';
      if (!acc[name]) acc[name] = [];
      acc[name].push(msg);
      return acc;
    }, {});
  }, [messages]);

  // Combined buyer list sorted by most recent message - only buyers with messages left
  const buyerList = useMemo(() => {
    const fromConvs = conversations
      .filter((c) => Boolean(c.lastMessage && c.lastMessage.trim().length > 0))
      .map((c) => c.buyerName);
    const fromMsgs = Object.keys(buyerGroups).filter((name) => (buyerGroups[name] || []).length > 0);
    const allNames = Array.from(new Set([...fromConvs, ...fromMsgs]));

    return allNames.sort((a, b) => {
      const convA = conversations.find((c) => c.buyerName === a);
      const convB = conversations.find((c) => c.buyerName === b);
      const timeA = convA?.lastMessageAt
        ? new Date(convA.lastMessageAt).getTime()
        : buyerGroups[a]?.[buyerGroups[a].length - 1]?.createdAt
          ? new Date(buyerGroups[a][buyerGroups[a].length - 1].createdAt!).getTime()
          : 0;
      const timeB = convB?.lastMessageAt
        ? new Date(convB.lastMessageAt).getTime()
        : buyerGroups[b]?.[buyerGroups[b].length - 1]?.createdAt
          ? new Date(buyerGroups[b][buyerGroups[b].length - 1].createdAt!).getTime()
          : 0;
      return timeB - timeA;
    });
  }, [conversations, buyerGroups]);

  // Auto-select or clear buyer selection based on available messages
  useEffect(() => {
    if (!selectedBuyer && buyerList.length > 0) {
      setSelectedBuyer(buyerList[0]);
    } else if (selectedBuyer && !buyerList.includes(selectedBuyer)) {
      setSelectedBuyer(buyerList.length > 0 ? buyerList[0] : null);
    }
  }, [buyerList, selectedBuyer]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    if (!selectedBuyer) return null;
    return conversations.find((c) => c.buyerName === selectedBuyer) || null;
  }, [conversations, selectedBuyer]);

  // Mark active chat as read helper
  const markActiveChatAsRead = useCallback(
    async (buyerName: string, buyerId?: string | null) => {
      if (!buyerName || !seller?.storeSlug) return;
      try {
        await api.post('/chat/read', {
          buyerName,
          buyerId: buyerId || null,
        });
        void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
        void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
        void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'unread-count'] });
      } catch {
        // Ignore read marking network errors
      }
    },
    [seller?.storeSlug, queryClient],
  );

  const handleSelectBuyer = useCallback(
    (name: string) => {
      setSelectedBuyer(name);
      const conv = conversations.find((c) => c.buyerName === name);
      void markActiveChatAsRead(name, conv?.buyerId || null);
    },
    [conversations, markActiveChatAsRead],
  );

  // Mark active chat as read when opened or when messages change
  useEffect(() => {
    if (selectedBuyer && seller?.storeSlug) {
      const conv = conversations.find((c) => c.buyerName === selectedBuyer);
      const activeMsgs = buyerGroups[selectedBuyer] || [];
      const hasUnread =
        (conv && conv.unreadCount > 0) ||
        activeMsgs.some((m) => m.sender === 'BUYER' && !m.isRead);

      if (hasUnread) {
        void markActiveChatAsRead(selectedBuyer, activeConversation?.buyerId || conv?.buyerId || null);
      }
    }
  }, [
    selectedBuyer,
    seller?.storeSlug,
    buyerGroups,
    conversations,
    activeConversation?.buyerId,
    markActiveChatAsRead,
  ]);

  // Real-time socket connection
  useEffect(() => {
    const socket = createSocketClient({
      url: window.location.origin.includes('localhost') ? 'http://localhost:7100' : undefined,
    });

    if (seller?.storeSlug) {
      socket.emit('join_chat', { sellerSlug: seller.storeSlug });
    }

    socket.on('new_message', (incoming: ChatMessage) => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'unread-count'] });

      if (incoming.sender === 'BUYER' && incoming.buyerName) {
        if (!selectedBuyer) {
          setSelectedBuyer(incoming.buyerName);
          void markActiveChatAsRead(incoming.buyerName, incoming.buyerId || null);
        } else if (selectedBuyer.toLowerCase().trim() === incoming.buyerName.toLowerCase().trim()) {
          // If seller is actively viewing this buyer's chat, mark as read immediately
          void markActiveChatAsRead(incoming.buyerName, incoming.buyerId || null);
        }
      }
    });

    socket.on('chat:blocked', () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
    });

    socket.on('chat:unblocked', () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
    });

    socket.on('chat:deleted', () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'unread-count'] });
    });

    socket.on('chat:messages_deleted', () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'unread-count'] });
    });

    return () => {
      if (seller?.storeSlug) {
        socket.emit('leave_chat', { sellerSlug: seller.storeSlug });
      }
      socket.disconnect();
    };
  }, [seller?.storeSlug, selectedBuyer, queryClient, markActiveChatAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, selectedBuyer]);

  const activeMessages = selectedBuyer ? buyerGroups[selectedBuyer] || [] : [];
  const latestMessageWithProduct = [...activeMessages].reverse().find((m) => m.productTitle);
  const isBlocked = Boolean(activeConversation?.isBlocked);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (input: string | Partial<ChatMessage>) => {
      if (isBlocked) {
        throw new Error('This conversation is blocked. Messaging is disabled.');
      }
      let payload: any;
      if (typeof input === 'string') {
        payload = {
          text: input,
          buyerName: selectedBuyer || 'Customer',
          buyerId: activeConversation?.buyerId || null,
          productId: latestMessageWithProduct?.productId || null,
          productTitle: latestMessageWithProduct?.productTitle || null,
          productImage: latestMessageWithProduct?.productImage || null,
          productPricePaise: latestMessageWithProduct?.productPricePaise || null,
        };
      } else {
        payload = {
          buyerName: selectedBuyer || 'Customer',
          buyerId: activeConversation?.buyerId || null,
          ...input,
        };
      }
      const res = await api.post<{ message: ChatMessage }>('/chat/messages', payload);
      return res.data.message;
    },
    onSuccess: () => {
      setInputText('');
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Unable to send message.';
      showToast.error('Message failed', msg);
    },
  });

  // Quote State & Handlers
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteQty, setQuoteQty] = useState<string>('10');
  const [quoteUnitPriceRupees, setQuoteUnitPriceRupees] = useState<string>('');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quoteProductId, setQuoteProductId] = useState<string>('');
  const [quoteProductTitle, setQuoteProductTitle] = useState<string>('');
  const [quoteProductImage, setQuoteProductImage] = useState<string>('');
  const [quoteProductOriginalPricePaise, setQuoteProductOriginalPricePaise] = useState<number | null>(null);

  const handleOpenQuote = () => {
    if (latestMessageWithProduct?.productTitle) {
      setQuoteProductId(latestMessageWithProduct.productId || '');
      setQuoteProductTitle(latestMessageWithProduct.productTitle || '');
      setQuoteProductImage(latestMessageWithProduct.productImage || '');
      setQuoteProductOriginalPricePaise(latestMessageWithProduct.productPricePaise || null);
      if (latestMessageWithProduct.productPricePaise) {
        setQuoteUnitPriceRupees((latestMessageWithProduct.productPricePaise / 100).toString());
      } else {
        setQuoteUnitPriceRupees('');
      }
    } else {
      setQuoteProductId('');
      setQuoteProductTitle('Custom Wholesale Order');
      setQuoteProductImage('');
      setQuoteProductOriginalPricePaise(null);
      setQuoteUnitPriceRupees('');
    }
    setQuoteQty('10');
    setQuoteNotes('Special negotiated wholesale quotation rate.');
    setIsQuoteModalOpen(true);
  };

  const handleSendQuote = async () => {
    if (!selectedBuyer || isBlocked) return;
    const unitPrice = parseFloat(quoteUnitPriceRupees);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      showToast.error('Invalid Price', 'Please enter a valid negotiated unit price.');
      return;
    }
    const qty = parseInt(quoteQty, 10);
    if (!quoteQty || isNaN(qty) || qty <= 0) {
      showToast.error('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }

    const unitPricePaise = Math.round(unitPrice * 100);
    const totalPricePaise = unitPricePaise * qty;
    const title = quoteProductTitle.trim() || 'Custom Order Product';

    const quoteText = `⚡ Official Custom Quotation:\n• Product: ${title}\n• Quantity: ${qty} units\n• Negotiated Price: ₹${unitPrice.toFixed(2)} / unit\n• Total: ₹${(totalPricePaise / 100).toFixed(2)}${quoteNotes.trim() ? `\n• Notes: ${quoteNotes.trim()}` : ''}`;

    try {
      await sendMessageMutation.mutateAsync({
        text: quoteText,
        productId: quoteProductId || null,
        productTitle: title,
        productImage: quoteProductImage || null,
        productPricePaise: quoteProductOriginalPricePaise || unitPricePaise,
        isQuote: true,
        quotePricePaise: unitPricePaise,
        quoteQuantity: qty,
        quoteTotalPricePaise: totalPricePaise,
        quoteNotes: quoteNotes.trim() || null,
        quoteStatus: 'OFFERED',
      });
      setIsQuoteModalOpen(false);
      showToast.success('Custom Quote Sent!', `Quotation of ${qty} units @ ₹${unitPrice}/unit sent to ${selectedBuyer}.`);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || sendMessageMutation.isPending || isBlocked) return;
    sendMessageMutation.mutate(trimmed);
  };

  // Toggle selection checkbox for buyer thread
  const handleToggleSelectChat = (buyerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChatKeys((prev) =>
      prev.includes(buyerName) ? prev.filter((n) => n !== buyerName) : [...prev, buyerName],
    );
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    const filtered = buyerList.filter((n) => n.toLowerCase().includes(searchFilter.toLowerCase()));
    if (selectedChatKeys.length === filtered.length) {
      setSelectedChatKeys([]);
    } else {
      setSelectedChatKeys(filtered);
    }
  };

  // Delete selected chats completely from DB
  const handleDeleteSelectedChats = async () => {
    if (selectedChatKeys.length === 0) return;

    const confirmed = await showConfirm({
      title: 'Delete Conversation(s)?',
      text: `This will permanently delete ${selectedChatKeys.length} selected chat(s) and all messages from the database for both you and the buyers. This action cannot be undone.`,
      confirmButtonText: 'Yes, delete permanently',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete('/chat/conversations', {
        conversations: selectedChatKeys.map((name) => {
          const conv = conversations.find((c) => c.buyerName === name);
          return {
            buyerName: name,
            buyerId: conv?.buyerId || null,
          };
        }),
      });

      showToast.success('Deleted Successfully', 'Selected conversation(s) permanently deleted from DB.');

      if (selectedBuyer && selectedChatKeys.includes(selectedBuyer)) {
        const remaining = buyerList.filter((n) => !selectedChatKeys.includes(n));
        setSelectedBuyer(remaining.length > 0 ? remaining[0] : null);
      }

      setSelectedChatKeys([]);
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
    } catch {
      showToast.error('Delete Failed', 'Unable to delete conversation(s).');
    }
  };

  // Block conversation
  const handleBlockChat = async () => {
    if (!selectedBuyer) return;

    const confirmed = await showConfirm({
      title: 'Block this Buyer?',
      text: 'If blocked, neither you nor the buyer will be able to send messages. The chat will be disabled.',
      confirmButtonText: 'Yes, block chat',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.post('/chat/block', {
        buyerName: selectedBuyer,
        buyerId: activeConversation?.buyerId || null,
      });

      showToast.info('Chat Blocked', `Chat with ${selectedBuyer} is now blocked.`);
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
    } catch {
      showToast.error('Action Failed', 'Unable to block chat.');
    }
  };

  // Unblock conversation
  const handleUnblockChat = async () => {
    if (!selectedBuyer) return;

    const confirmed = await showConfirm({
      title: 'Unblock this Buyer?',
      text: 'Messaging will be re-enabled for both parties.',
      confirmButtonText: 'Yes, unblock',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.post('/chat/unblock', {
        buyerName: selectedBuyer,
        buyerId: activeConversation?.buyerId || null,
      });

      showToast.success('Chat Unblocked', `Chat with ${selectedBuyer} is now unblocked.`);
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'conversations'] });
    } catch {
      showToast.error('Action Failed', 'Unable to unblock chat.');
    }
  };

  const filteredBuyerList = useMemo(() => {
    return buyerList.filter((name) => {
      const msgs = buyerGroups[name] || [];
      const conv = conversations.find((c) => c.buyerName === name);
      const hasMessage = msgs.length > 0 || Boolean(conv?.lastMessage && conv.lastMessage.trim().length > 0);
      if (!hasMessage) return false;
      return name.toLowerCase().includes(searchFilter.toLowerCase());
    });
  }, [buyerList, buyerGroups, conversations, searchFilter]);

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-brand-600" />
            <span>Customer Inquiries & Live Chat</span>
          </h1>
          <p className="mt-1 text-caption text-ink-500">
            Real-time chat with buyers inquiring about your products, stock availability, and scheduled deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void refetchConversations();
              void refetchMessages();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs hover:bg-surface-sunken transition-colors cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isConvsRefetching || isMsgsLoading ? 'animate-spin text-brand-600' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {isConvsLoading ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[460px] w-full">
          <Loader2 className="h-8 w-8 text-brand-600 animate-spin mb-3" />
          <h2 className="text-base font-semibold text-ink-700">Loading messages...</h2>
        </div>
      ) : buyerList.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[460px] w-full">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#16135c]/5 text-[#16135c] mb-4">
            <MessageSquare className="h-8 w-8 text-[#16135c]" />
          </div>
          <h2 className="text-2xl font-bold text-ink-900">No message</h2>
          <p className="mt-2 text-sm text-ink-500 max-w-md leading-relaxed">
            There are no customer messages or inquiries yet. When buyers start a chat with your store, their messages will appear here.
          </p>
          <button
            type="button"
            onClick={() => {
              void refetchConversations();
              void refetchMessages();
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#16135c] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#12104b] transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isConvsRefetching ? 'animate-spin' : ''}`} />
            <span>Check for new messages</span>
          </button>
        </div>
      ) : (
        /* Main Chat Interface */
        <div className="flex flex-col md:flex-row w-full h-[calc(100vh-210px)] min-h-[580px] max-h-[850px] rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
          
          {/* Left Sidebar: Conversations List */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-line flex flex-col bg-surface-sunken/40 shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-line bg-surface">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search inquiries..."
                  className="w-full rounded-lg border border-line bg-surface-sunken pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Checkbox Action Toolbar */}
            {filteredBuyerList.length > 0 ? (
              <div className="px-3 py-2 text-[11px] border-b border-line bg-surface flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-800 select-none">
                  <input
                    type="checkbox"
                    checked={
                      filteredBuyerList.length > 0 &&
                      selectedChatKeys.length === filteredBuyerList.length
                    }
                    onChange={handleToggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <span>
                    {selectedChatKeys.length > 0
                      ? `${selectedChatKeys.length} selected`
                      : 'Select All'}
                  </span>
                </label>

                {selectedChatKeys.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedChats}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="Permanently delete selected chat(s) from DB"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Conversations Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-line admin-scrollbar">
              {filteredBuyerList.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-400">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-sunken text-ink-300 mx-auto mb-3">
                    <MessageSquare size={22} />
                  </div>
                  <h4 className="font-semibold text-ink-700 text-sm">No Conversations</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                    No active inquiries yet.
                  </p>
                </div>
              ) : (
                filteredBuyerList.map((name) => {
                const msgs = buyerGroups[name] || [];
                const lastMsg = msgs[msgs.length - 1];
                const conv = conversations.find((c) => c.buyerName === name);
                const isSelected = selectedBuyer === name;
                const isChecked = selectedChatKeys.includes(name);
                const rawUnread = conv?.unreadCount ?? (lastMsg?.sender === 'BUYER' && !lastMsg.isRead ? 1 : 0);
                const unreadCount = isSelected ? 0 : rawUnread;
                const hasUnread = !isSelected && unreadCount > 0;
                const hasProduct = msgs.some((m) => m.productTitle);
                const convBlocked = conv?.isBlocked;

                return (
                  <div
                    key={name}
                    onClick={() => handleSelectBuyer(name)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected ? 'bg-surface border-l-4 border-l-brand-600 shadow-2xs' : 'hover:bg-surface/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className="pt-1 shrink-0"
                      onClick={(e) => handleToggleSelectChat(name, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>

                    {/* Avatar */}
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold text-xs mt-0.5">
                      {name.charAt(0).toUpperCase()}
                      {convBlocked ? (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" title="Blocked" />
                      ) : (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    {/* Details with WhatsApp-Style Bold Unread */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs truncate ${
                            hasUnread
                              ? 'font-black text-ink-900'
                              : isSelected
                                ? 'font-bold text-brand-700'
                                : 'font-semibold text-ink-800'
                          }`}
                        >
                          {name}
                        </h4>
                        {lastMsg?.createdAt ? (
                          <span
                            className={`text-[10px] shrink-0 ${
                              hasUnread ? 'font-bold text-[#0AAD0A]' : 'text-ink-400'
                            }`}
                          >
                            {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : null}
                      </div>

                      {/* Blocked / Verified Badge */}
                      {convBlocked ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200 mb-1">
                          <Ban size={9} /> Blocked
                        </span>
                      ) : null}

                      {/* Last Message + WhatsApp-Style Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            hasUnread ? 'font-black text-ink-900' : 'text-ink-500'
                          }`}
                        >
                          {lastMsg ? (lastMsg.sender === 'SELLER' ? 'You: ' : '') + lastMsg.text : 'No messages'}
                        </p>

                        {hasUnread ? (
                          <span className="grid h-5 min-w-5 px-1.5 place-items-center rounded-full bg-[#0AAD0A] text-white text-[10px] font-bold shadow-2xs shrink-0 leading-none">
                            {unreadCount}
                          </span>
                        ) : null}
                      </div>

                      {hasProduct ? (
                        <div className="mt-1 inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                          <ShoppingBag className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[140px]">
                            {msgs.find((m) => m.productTitle)?.productTitle}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Right Main Area: Active Chat Window */}
          <div className="flex-1 flex flex-col bg-surface min-w-0 overflow-hidden">
            {selectedBuyer ? (
              <>
                {/* Active Chat Header or WhatsApp-Style Selection Bar */}
                {isSelectionMode ? (
                  <div className="p-3.5 bg-[#16135c] text-white flex items-center justify-between gap-3 shadow-md shrink-0 transition-all animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedMessageIds([])}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
                        title="Cancel Selection (Esc)"
                      >
                        <X size={20} />
                      </button>
                      <span className="text-sm font-bold tracking-wide">
                        {selectedMessageIds.length} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteSelectedMessages}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        title="Delete selected messages from your view"
                      >
                        <Trash2 size={15} />
                        <span>Delete for me</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 border-b border-line flex items-center justify-between gap-3 bg-surface">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-xs">
                        {selectedBuyer.charAt(0).toUpperCase()}
                        {isBlocked ? (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                        ) : (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-ink-900 truncate">{selectedBuyer}</h3>
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded-full border border-red-200 shrink-0">
                              <Ban className="h-2.5 w-2.5" /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Active Buyer
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-400 mt-0.5">
                          Store: <span className="font-semibold text-ink-700">{seller?.storeName || 'My Store'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions: Attached Product & Block/Unblock Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {latestMessageWithProduct?.productTitle ? (
                        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-line bg-surface-sunken p-2">
                          {latestMessageWithProduct.productImage ? (
                            <img
                              src={latestMessageWithProduct.productImage}
                              alt=""
                              className="h-9 w-9 rounded-lg object-cover border border-line"
                            />
                          ) : (
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white border border-line text-ink-400">
                              <Tag className="h-4 w-4" />
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs font-bold text-ink-900 truncate max-w-[150px]">
                              {latestMessageWithProduct.productTitle}
                            </p>
                            {latestMessageWithProduct.productPricePaise ? (
                              <p className="text-[11px] font-semibold text-brand-700">
                                {money(latestMessageWithProduct.productPricePaise)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {/* Header Quote Button */}
                      {!isBlocked && (
                        <button
                          type="button"
                          onClick={handleOpenQuote}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-[#16135c] px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                          title="Create custom price quotation for this customer"
                        >
                          <Sparkles size={13} className="text-amber-500" />
                          <span>Quote</span>
                        </button>
                      )}

                      {/* Block / Unblock Button */}
                      {isBlocked ? (
                        <button
                          type="button"
                          onClick={handleUnblockChat}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                          title="Unblock this buyer"
                        >
                          <Unlock size={13} />
                          <span>Unblock</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleBlockChat}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                          title="Block this buyer"
                        >
                          <Ban size={13} />
                          <span>Block</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Blocked Alert Banner */}
                {isBlocked ? (
                  <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 flex items-center gap-2.5 text-xs text-red-800 shrink-0">
                    <AlertTriangle size={15} className="text-red-600 shrink-0" />
                    <p className="leading-tight">
                      <strong>This conversation is blocked.</strong> Neither party can send or receive messages while blocked.
                    </p>
                  </div>
                ) : null}

                {/* Messages Stream */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] admin-scrollbar"
                >
                  {activeMessages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-ink-400 my-auto">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 text-gray-400 mx-auto mb-3">
                        <MessageSquare size={20} />
                      </div>
                      <p className="font-semibold text-ink-700 text-sm">No messages yet</p>
                      <p className="mt-1 text-[11px] text-ink-500">
                        Inquiries from {selectedBuyer} will appear here.
                      </p>
                    </div>
                  ) : (
                    activeMessages.map((msg, idx) => {
                      const isMe = msg.sender === 'SELLER';
                      const isMsgSelected = Boolean(msg._id && selectedMessageIds.includes(msg._id));

                      return (
                        <div
                          key={msg._id || idx}
                          onClick={() => handleMessageClick(msg._id)}
                          onPointerDown={() => handlePointerDownMessage(msg._id)}
                          onPointerUp={handlePointerUpMessage}
                          onPointerLeave={handlePointerUpMessage}
                          onContextMenu={(e) => {
                            if (msg._id) {
                              e.preventDefault();
                              handleContextMenuSelect(msg._id);
                            }
                          }}
                          className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full ${
                            isMsgSelected
                              ? 'bg-emerald-500/10 -mx-3 px-3 py-1 rounded-xl transition-colors'
                              : 'transition-colors'
                          } ${isSelectionMode ? 'cursor-pointer select-none' : 'select-none'}`}
                        >
                          {/* Attached Product Context Card */}
                          {msg.productTitle && !isMe ? (
                            <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-[#dfe2e1] bg-white p-2 shadow-2xs max-w-sm">
                              {msg.productImage ? (
                                <img
                                  src={msg.productImage}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover border border-gray-100"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wide">
                                  Product Inquiry
                                </span>
                                <p className="text-xs font-bold text-ink-900 truncate">{msg.productTitle}</p>
                                {msg.productPricePaise ? (
                                  <p className="text-[11px] font-semibold text-emerald-700">
                                    {money(msg.productPricePaise)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {/* Message Bubble or Custom Quote Card */}
                          {msg.isQuote ? (
                            <div className="relative rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 p-4 text-xs shadow-md max-w-md w-full space-y-2.5">
                              <div className="flex items-center justify-between gap-2 border-b border-blue-100 pb-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16135c] text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                                  <Sparkles size={11} className="text-amber-400" /> Custom Quote Sent
                                </span>
                                <span className="text-[10px] font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                  Final Price Agreed
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {msg.productImage ? (
                                  <img
                                    src={msg.productImage}
                                    alt=""
                                    className="h-12 w-12 rounded-xl object-cover border border-blue-200 bg-white shrink-0"
                                  />
                                ) : (
                                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-blue-200 text-[#16135c] shrink-0">
                                    <ShoppingBag size={20} />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[#16135c] truncate">{msg.productTitle || 'Product'}</p>
                                  <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                                    <span className="text-sm font-black text-emerald-700">
                                      {money(msg.quotePricePaise || 0)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-medium">/ unit</span>
                                    {msg.productPricePaise && msg.quotePricePaise && msg.quotePricePaise < msg.productPricePaise && (
                                      <span className="text-[10px] text-gray-400 line-through">
                                        {money(msg.productPricePaise)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/90 border border-blue-100 text-center">
                                <div>
                                  <span className="block text-[10px] text-gray-500 font-medium">Agreed Quantity</span>
                                  <span className="block text-xs font-bold text-[#16135c]">{msg.quoteQuantity || 1} units</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-gray-500 font-medium">Total Quote Value</span>
                                  <span className="block text-xs font-black text-[#16135c]">{money(msg.quoteTotalPricePaise || 0)}</span>
                                </div>
                              </div>

                              {msg.quoteNotes && (
                                <p className="text-[10px] text-gray-600 bg-blue-50/50 p-2 rounded-lg italic">
                                  &ldquo;{msg.quoteNotes}&rdquo;
                                </p>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`relative rounded-2xl px-4 py-2.5 text-xs shadow-2xs max-w-md transition-all ${
                                isMsgSelected ? 'ring-2 ring-[#0AAD0A] ring-offset-2 scale-[1.01]' : ''
                              } ${
                                isMe
                                  ? 'bg-[#16135c] text-white rounded-br-none'
                                  : 'bg-white border border-[#dfe2e1] text-[#21313c] rounded-bl-none'
                              }`}
                            >
                              {/* Selected Checkmark Badge (WhatsApp-Style) */}
                              {isMsgSelected && (
                                <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#0AAD0A] text-white flex items-center justify-center shadow-xs z-10 animate-in zoom-in-75 duration-150">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}

                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          )}

                          {/* Timestamp */}
                          <span className="mt-1 text-[10px] text-ink-400 px-1">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Just now'}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-line bg-surface shrink-0">
                  {/* Negotiated Custom Quote Composer */}
                  {isQuoteModalOpen && (
                    <div className="mb-3 p-4 rounded-2xl border-2 border-[#16135c] bg-white shadow-xl animate-in slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-[#16135c]">
                            <Sparkles size={15} className="text-amber-500" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#16135c]">Create Negotiated Custom Quote</h4>
                            <p className="text-[10px] text-gray-500">
                              Send finalized negotiated pricing & quantity directly to {selectedBuyer}.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsQuoteModalOpen(false)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Cancel quote"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Product Reference */}
                      <div className="mt-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {quoteProductImage ? (
                            <img
                              src={quoteProductImage}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover border border-gray-200 bg-white"
                            />
                          ) : (
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white border border-gray-200 text-gray-400">
                              <ShoppingBag size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {quoteProductTitle || 'Negotiated Wholesale Item'}
                            </p>
                            {quoteProductOriginalPricePaise ? (
                              <p className="text-[10px] text-gray-500">
                                Regular Listing Price:{' '}
                                <span className="font-semibold text-gray-700">
                                  {money(quoteProductOriginalPricePaise)}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Inputs Grid: Quantity & Agreed Unit Price */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Quantity (Qty) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={quoteQty}
                              onChange={(e) => setQuoteQty(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                              placeholder="e.g. 50"
                            />
                            <span className="absolute right-3 top-2 text-[10px] font-semibold text-gray-400">
                              units
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Negotiated Price / Unit (₹) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={quoteUnitPriceRupees}
                              onChange={(e) => setQuoteUnitPriceRupees(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white pl-7 pr-3 py-2 text-xs font-bold text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                              placeholder="e.g. 38.00"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Notes / Remarks */}
                      <div className="mt-2.5">
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Quotation Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={quoteNotes}
                          onChange={(e) => setQuoteNotes(e.target.value)}
                          placeholder="e.g. Special agreed wholesale discount rate"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#16135c] focus:outline-none"
                        />
                      </div>

                      {/* Calculated Summary & Done Button */}
                      <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Total Quote Value:</span>
                          <span className="text-base font-black text-[#16135c]">
                            {money(
                              Math.round(
                                (parseFloat(quoteUnitPriceRupees) || 0) * 100 * (parseInt(quoteQty, 10) || 0)
                              )
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsQuoteModalOpen(false)}
                            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSendQuote}
                            disabled={
                              !quoteUnitPriceRupees ||
                              parseFloat(quoteUnitPriceRupees) <= 0 ||
                              !quoteQty ||
                              parseInt(quoteQty, 10) <= 0 ||
                              sendMessageMutation.isPending
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white px-4 py-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sendMessageMutation.isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>Done</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    {/* Quote Trigger Button */}
                    <button
                      type="button"
                      onClick={handleOpenQuote}
                      disabled={isBlocked || sendMessageMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-[#16135c] px-3.5 py-2 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      title="Create & Send Negotiated Custom Quote"
                    >
                      <Sparkles size={14} className="text-amber-500" />
                      <span>Quote</span>
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isBlocked || sendMessageMutation.isPending}
                      placeholder={
                        isBlocked
                          ? 'This conversation is blocked. Messaging is disabled.'
                          : `Reply to ${selectedBuyer}...`
                      }
                      className="flex-1 rounded-xl border border-line bg-surface-sunken px-3.5 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={isBlocked || !inputText.trim() || sendMessageMutation.isPending}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-xs hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                      title={isBlocked ? 'Chat is blocked' : 'Send Message'}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 mb-4">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h2 className="text-base font-bold text-ink-900">Select a Conversation</h2>
                <p className="mt-1 text-xs text-ink-500 max-w-sm">
                  Choose a customer from the left list to respond to their product and stock questions in real time.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
