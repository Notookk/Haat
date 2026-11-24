import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  ShoppingBag,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  ArrowLeft,
  Trash2,
  Ban,
  Unlock,
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  Package,
  Clock,
  Truck,
  PhoneCall,
  FileText,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { api, money, showToast, showConfirm, createSocketClient } from '@haat/shared-frontend';
import type { AddressResponseItem } from '@haat/shared-contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { addProductToCart, useRedeemedQuoteIds } from '../features/chat/chatStore';

export interface ChatMessageItem {
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
  createdAt?: string;
  isQuote?: boolean;
  quotePricePaise?: number | null;
  quoteQuantity?: number | null;
  quoteTotalPricePaise?: number | null;
  quoteNotes?: string | null;
  quoteStatus?: 'OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'ORDERED';
}

export interface ChatConversationItem {
  sellerSlug: string;
  sellerName: string;
  buyerName?: string;
  buyerId?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isBlocked?: boolean;
  blockedBy?: 'BUYER' | 'SELLER' | null;
  blockedReason?: string | null;
}

export interface QuickInquiryCard {
  id: string;
  title: string;
  prompt: string;
  subtitle: string;
  icon: typeof Sparkles;
}

export function ChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const redeemedQuoteIds = useRedeemedQuoteIds();

  // URL Query Parameters (when initiated from a product card or store)
  const paramSellerSlug = searchParams.get('seller');
  const paramSellerName = searchParams.get('sellerName');
  const paramProductId = searchParams.get('productId');
  const paramProductTitle = searchParams.get('productTitle');
  const paramProductSku = searchParams.get('sku');
  const paramProductImage = searchParams.get('productImage');
  const paramProductPrice = searchParams.get('price');

  const hasAttachedProduct = Boolean(paramProductId || paramProductTitle);

  // State
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [activeSellerSlug, setActiveSellerSlug] = useState<string | null>(paramSellerSlug || null);
  const [activeSellerName, setActiveSellerName] = useState<string>(paramSellerName || '');
  const [selectedChatSlugs, setSelectedChatSlugs] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState<boolean>(() => Boolean(paramSellerSlug));

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
    if (isSelectionMode) return; // If already selecting, clicks directly toggle

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
          ? 'Are you sure you want to delete this message? It will be deleted from your view (the seller will still see it).'
          : `Are you sure you want to delete these ${count} messages? They will be deleted from your view (the seller will still see them).`,
      confirmButtonText: 'Delete for me',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete('/chat/messages', { messageIds: selectedMessageIds });
      showToast.success('Deleted', `${count} message(s) deleted from your chat.`);
      setMessages((prev) => prev.filter((m) => m._id && !selectedMessageIds.includes(m._id)));
      setSelectedMessageIds([]);
      if (activeSellerSlug) {
        void fetchConversations(true);
      }
      void queryClient.invalidateQueries({ queryKey: ['buyer', 'chat', 'unread-count'] });
    } catch {
      showToast.error('Delete Failed', 'Unable to delete messages. Please try again.');
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch user addresses for customer contact info
  const { data: addressesData } = useQuery<{ addresses: AddressResponseItem[] }>({
    queryKey: ['buyer-addresses'],
    queryFn: async () => {
      const res = await api.get<{ addresses: AddressResponseItem[] }>('/addresses');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const defaultAddress = useMemo(() => {
    const list = addressesData?.addresses || [];
    return list.find((a) => a.isDefault) || list[0] || null;
  }, [addressesData]);

  // Quick Inquiry Small Text Cards with product awareness
  const quickInquiryCards: QuickInquiryCard[] = useMemo(() => {
    const hasProduct = Boolean(paramProductTitle);
    const pTitle = paramProductTitle ? `"${paramProductTitle}"` : 'this product';

    return [
      {
        id: 'in-stock',
        title: 'Check In-Stock',
        prompt: hasProduct
          ? `Hi, is ${pTitle} available in stock for immediate order?`
          : 'Hi, is this item available in stock for immediate order?',
        subtitle: 'Inventory & availability check',
        icon: Package,
      },
      {
        id: 'schedule-delivery',
        title: 'Schedule Delivery',
        prompt: hasProduct
          ? `Hi, can I schedule delivery for ${pTitle} for tomorrow or select a delivery slot?`
          : 'Hi, can I schedule delivery for tomorrow or select a preferred delivery slot?',
        subtitle: 'Next-day & slot booking',
        icon: Clock,
      },
      {
        id: 'wholesale-rates',
        title: 'Bulk & Wholesale Rates',
        prompt: hasProduct
          ? `Hi, do you offer bulk wholesale pricing or quantity discounts for ${pTitle}?`
          : 'Hi, do you offer bulk wholesale rates and quantity discounts for larger orders?',
        subtitle: 'Wholesale tiered discounts',
        icon: ShoppingBag,
      },
      {
        id: 'delivery-timeline',
        title: 'Delivery Timeline',
        prompt: hasProduct
          ? `Hi, what is the expected delivery timeline and dispatch duration for ${pTitle}?`
          : 'Hi, what is the expected delivery timeline and dispatch duration for my location?',
        subtitle: 'Transit & courier time',
        icon: Truck,
      },
      {
        id: 'request-call',
        title: 'Request Callback',
        prompt: hasProduct
          ? `Hi, I am interested in ordering ${pTitle}. Please call me to confirm order specifications.`
          : 'Hi, I would like to place an order. Please call me directly to assist with my purchase.',
        subtitle: 'Direct phone discussion',
        icon: PhoneCall,
      },
      {
        id: 'custom-quote',
        title: 'Request Custom Quote',
        prompt: hasProduct
          ? `Hi, please share a custom quotation and best rate for ${pTitle}.`
          : 'Hi, please provide a custom price quotation and available volume discounts.',
        subtitle: 'Best rate & RFQ quote',
        icon: FileText,
      },
    ];
  }, [paramProductTitle]);

  // Embla carousel for draggable cards
  const [cardsEmblaRef, cardsEmblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
  });

  const isDraggingCardsRef = useRef(false);

  useEffect(() => {
    if (!cardsEmblaApi) return;
    const onPointerDown = () => {
      isDraggingCardsRef.current = false;
    };
    const onScroll = () => {
      isDraggingCardsRef.current = true;
    };
    cardsEmblaApi.on('pointerDown', onPointerDown);
    cardsEmblaApi.on('scroll', onScroll);
    return () => {
      cardsEmblaApi.off('pointerDown', onPointerDown);
      cardsEmblaApi.off('scroll', onScroll);
    };
  }, [cardsEmblaApi]);

  const scrollCards = (direction: 'left' | 'right') => {
    if (!cardsEmblaApi) return;
    if (direction === 'left') {
      cardsEmblaApi.scrollPrev();
    } else {
      cardsEmblaApi.scrollNext();
    }
  };

  // Active conversation object
  const activeConversation = useMemo(() => {
    if (!activeSellerSlug) return null;
    return conversations.find((c) => c.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()) || null;
  }, [conversations, activeSellerSlug]);

  // Scroll window to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Fetch real conversations from backend (NO dummy data)
  const fetchConversations = async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setIsLoadingConvs(true);
    try {
      const res = await api.get<{ conversations: ChatConversationItem[] }>('/chat/conversations');
      const list = res.data?.conversations || [];
      setConversations(list);

      // If user came with URL param and it's not yet in list, ensure we keep activeSellerSlug
      if (paramSellerSlug && !list.some((c) => c.sellerSlug.toLowerCase() === paramSellerSlug.toLowerCase())) {
        setActiveSellerSlug(paramSellerSlug);
        if (paramSellerName) setActiveSellerName(paramSellerName);
      } else if (!activeSellerSlug && list.length > 0) {
        setActiveSellerSlug(list[0].sellerSlug);
        setActiveSellerName(list[0].sellerName);
      }
    } catch {
      setConversations([]);
    } finally {
      if (!silent) setIsLoadingConvs(false);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (slug: string, silent = false) => {
    if (!isAuthenticated || !slug) return;
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await api.get<{ messages: ChatMessageItem[]; conversation?: ChatConversationItem }>(
        `/chat/${encodeURIComponent(slug)}/messages`,
      );
      const list = res.data?.messages || [];
      setMessages(list);

      if (res.data?.conversation) {
        setConversations((prev) =>
          prev.map((c) =>
            c.sellerSlug.toLowerCase() === slug.toLowerCase() ? { ...c, ...res.data!.conversation } : c,
          ),
        );
      }

      // Automatically mark as read if conversation had unread messages
      void markAsRead(slug);
    } catch {
      setMessages([]);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  // Mark chat as read
  const markAsRead = async (slug: string) => {
    if (!slug) return;
    try {
      await api.post(`/chat/${encodeURIComponent(slug)}/read`, {});
      // Update local unread state immediately
      setConversations((prev) =>
        prev.map((c) => (c.sellerSlug.toLowerCase() === slug.toLowerCase() ? { ...c, unreadCount: 0 } : c)),
      );
      void queryClient.invalidateQueries({ queryKey: ['buyer', 'chat', 'unread-count'] });
    } catch {
      // Ignore
    }
  };

  // Sync with URL params
  useEffect(() => {
    if (paramSellerSlug) {
      setActiveSellerSlug(paramSellerSlug);
      if (paramSellerName) setActiveSellerName(paramSellerName);
      setMobileChatOpen(true);
    }
  }, [paramSellerSlug, paramSellerName]);

  // Initial load
  useEffect(() => {
    void fetchConversations();
  }, [isAuthenticated]);

  // Fetch messages whenever active seller changes
  useEffect(() => {
    if (activeSellerSlug) {
      void fetchMessages(activeSellerSlug);
    } else {
      setMessages([]);
    }
  }, [activeSellerSlug, isAuthenticated]);

  // Socket and Polling for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = createSocketClient({
      url: window.location.origin.includes('localhost') ? 'http://localhost:4000' : undefined,
    });

    if (activeSellerSlug) {
      socket.emit('join_chat', { sellerSlug: activeSellerSlug });
    }

    socket.on('new_message', (incoming: ChatMessageItem) => {
      // Refresh unread count in header
      void queryClient.invalidateQueries({ queryKey: ['buyer', 'chat', 'unread-count'] });

      // Refresh conversations list to update snippets and timestamps
      void fetchConversations(true);

      // If incoming message belongs to active chat, append immediately
      if (
        activeSellerSlug &&
        incoming.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m._id && incoming._id && m._id === incoming._id)) return prev;
          return [...prev, incoming];
        });
        void markAsRead(activeSellerSlug);
      }
    });

    socket.on('chat:blocked', (payload: any) => {
      if (activeSellerSlug && payload.sellerSlug?.toLowerCase() === activeSellerSlug.toLowerCase()) {
        setConversations((prev) =>
          prev.map((c) =>
            c.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()
              ? { ...c, isBlocked: true, blockedBy: payload.blockedBy }
              : c,
          ),
        );
      }
    });

    socket.on('chat:unblocked', (payload: any) => {
      if (activeSellerSlug && payload.sellerSlug?.toLowerCase() === activeSellerSlug.toLowerCase()) {
        setConversations((prev) =>
          prev.map((c) =>
            c.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()
              ? { ...c, isBlocked: false, blockedBy: null }
              : c,
          ),
        );
      }
    });

    socket.on('chat:deleted', () => {
      void fetchConversations(true);
      if (activeSellerSlug) {
        void fetchMessages(activeSellerSlug, true);
      }
      void queryClient.invalidateQueries({ queryKey: ['buyer', 'chat', 'unread-count'] });
    });

    socket.on('chat:messages_deleted', (payload: any) => {
      const ids: string[] = payload?.messageIds || [];
      if (ids.length > 0) {
        setMessages((prev) => prev.filter((m) => m._id && !ids.includes(m._id)));
      }
      void fetchConversations(true);
      void queryClient.invalidateQueries({ queryKey: ['buyer', 'chat', 'unread-count'] });
    });

    // Silent background poll every 3s
    const interval = setInterval(() => {
      void fetchConversations(true);
      if (activeSellerSlug) {
        void fetchMessages(activeSellerSlug, true);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (activeSellerSlug) {
        socket.emit('leave_chat', { sellerSlug: activeSellerSlug });
      }
      socket.disconnect();
    };
  }, [activeSellerSlug, isAuthenticated]);

  // Scroll to bottom of message list on updates
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, activeSellerSlug]);

  // Filter conversations - only show conversations with active messages remaining
  const filteredConversations = useMemo(() => {
    const withMessages = conversations.filter(
      (c) => Boolean(c.lastMessage && c.lastMessage.trim().length > 0),
    );
    const q = searchFilter.trim().toLowerCase();
    if (!q) return withMessages;
    return withMessages.filter(
      (c) =>
        c.sellerName.toLowerCase().includes(q) ||
        c.sellerSlug.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q)),
    );
  }, [conversations, searchFilter]);

  // Handle selecting a conversation
  const handleSelectConversation = (conv: ChatConversationItem) => {
    setActiveSellerSlug(conv.sellerSlug);
    setActiveSellerName(conv.sellerName);
    setMobileChatOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('seller', conv.sellerSlug);
      next.set('sellerName', conv.sellerName);
      return next;
    });
  };

  // Toggle selection checkbox for a chat
  const handleToggleSelectChat = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChatSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedChatSlugs.length === filteredConversations.length) {
      setSelectedChatSlugs([]);
    } else {
      setSelectedChatSlugs(filteredConversations.map((c) => c.sellerSlug));
    }
  };

  // Delete selected chats completely from DB
  const handleDeleteSelectedChats = async () => {
    if (selectedChatSlugs.length === 0) return;

    const confirmed = await showConfirm({
      title: 'Delete Conversation(s)?',
      text: `This will permanently delete ${selectedChatSlugs.length} selected chat(s) and all messages from the database for both you and the seller. This cannot be undone.`,
      confirmButtonText: 'Yes, delete permanently',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete('/chat/conversations', {
        conversations: selectedChatSlugs.map((slug) => ({ sellerSlug: slug })),
      });

      showToast.success('Deleted Successfully', 'Selected conversation(s) permanently removed from DB.');

      const remaining = conversations.filter((c) => !selectedChatSlugs.includes(c.sellerSlug));
      setConversations(remaining);

      if (activeSellerSlug && selectedChatSlugs.includes(activeSellerSlug)) {
        if (remaining.length > 0) {
          setActiveSellerSlug(remaining[0].sellerSlug);
          setActiveSellerName(remaining[0].sellerName);
        } else {
          setActiveSellerSlug(null);
          setActiveSellerName('');
          setMessages([]);
        }
      }

      setSelectedChatSlugs([]);
      void queryClient.invalidateQueries({ queryKey: ['buyer', 'chat', 'unread-count'] });
    } catch {
      showToast.error('Delete Failed', 'Unable to delete conversation(s). Please try again.');
    }
  };

  // Block conversation
  const handleBlockChat = async () => {
    if (!activeSellerSlug) return;

    const confirmed = await showConfirm({
      title: 'Block this Chat?',
      text: 'If blocked, neither you nor the seller will be able to send messages. The chat will be disabled.',
      confirmButtonText: 'Yes, block chat',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.post('/chat/block', {
        sellerSlug: activeSellerSlug,
        sellerName: activeSellerName,
      });

      showToast.info('Chat Blocked', 'This conversation is now blocked.');
      setConversations((prev) =>
        prev.map((c) =>
          c.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()
            ? { ...c, isBlocked: true, blockedBy: 'BUYER' }
            : c,
        ),
      );
    } catch {
      showToast.error('Action Failed', 'Unable to block chat.');
    }
  };

  // Unblock conversation
  const handleUnblockChat = async () => {
    if (!activeSellerSlug) return;

    const confirmed = await showConfirm({
      title: 'Unblock this Chat?',
      text: 'Messaging will be re-enabled for both parties.',
      confirmButtonText: 'Yes, unblock',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.post('/chat/unblock', {
        sellerSlug: activeSellerSlug,
      });

      showToast.success('Chat Unblocked', 'You can now chat with this seller again.');
      setConversations((prev) =>
        prev.map((c) =>
          c.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()
            ? { ...c, isBlocked: false, blockedBy: null }
            : c,
        ),
      );
    } catch {
      showToast.error('Action Failed', 'Unable to unblock chat.');
    }
  };

  // Send message directly from quick card with customer contact details
  const handleQuickCardSend = async (card: QuickInquiryCard) => {
    if (isSending || !isAuthenticated || !activeSellerSlug) return;

    if (activeConversation?.isBlocked) {
      showToast.error('Chat Blocked', 'This conversation is blocked and messaging is disabled.');
      return;
    }

    const name = user?.fullName || defaultAddress?.recipientName;
    const phone = user?.phoneNumber || defaultAddress?.phoneNumber;
    const email = user?.email;
    const loc = defaultAddress
      ? [defaultAddress.line1, defaultAddress.city, defaultAddress.state].filter(Boolean).join(', ') +
        (defaultAddress.pincode ? ` - ${defaultAddress.pincode}` : '')
      : null;

    const contactLines: string[] = [];
    if (name) contactLines.push(`• Name: ${name}`);
    if (phone) contactLines.push(`• Phone: ${phone}`);
    if (email) contactLines.push(`• Email: ${email}`);
    if (loc) contactLines.push(`• Delivery Address: ${loc}`);

    const contactBlock =
      contactLines.length > 0
        ? `\n\n👤 Customer Contact Details:\n${contactLines.join('\n')}`
        : '';

    const fullMessage = `${card.prompt}${contactBlock}`;
    await handleSendMessage(fullMessage);
  };

  const onCardClick = (card: QuickInquiryCard) => {
    if (isDraggingCardsRef.current) return;
    void handleQuickCardSend(card);
  };

  // Send message (via input text or direct quick card)
  const handleSendMessage = async (customText?: string) => {
    const text = (typeof customText === 'string' ? customText : inputText).trim();
    if (!text || isSending || !isAuthenticated || !activeSellerSlug) return;

    if (activeConversation?.isBlocked) {
      showToast.error('Chat Blocked', 'This conversation is blocked and messaging is disabled.');
      return;
    }

    if (!customText) {
      setInputText('');
    }
    setIsSending(true);

    const priceNum = paramProductPrice ? Number(paramProductPrice) : null;
    const tempMsg: ChatMessageItem = {
      sellerSlug: activeSellerSlug,
      sellerName: activeSellerName || activeSellerSlug,
      buyerName: user?.fullName || 'Customer',
      buyerId: user?.id || null,
      sender: 'BUYER',
      text,
      productId: paramProductId || null,
      productTitle: paramProductTitle || null,
      productImage: paramProductImage || null,
      productPricePaise: Number.isFinite(priceNum) ? priceNum : null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      await api.post(`/chat/${encodeURIComponent(activeSellerSlug)}/messages`, {
        sellerSlug: activeSellerSlug,
        sellerName: activeSellerName || activeSellerSlug,
        buyerName: user?.fullName || 'Customer',
        buyerId: user?.id || null,
        text,
        productId: paramProductId || null,
        productTitle: paramProductTitle || null,
        productImage: paramProductImage || null,
        productPricePaise: Number.isFinite(priceNum) ? priceNum : null,
      });

      void fetchMessages(activeSellerSlug, true);
      void fetchConversations(true);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Unable to send message.';
      showToast.error('Failed to send', errMsg);
      // Remove optimistic message if blocked
      setMessages((prev) => prev.filter((m) => m !== tempMsg));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Sign-in gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] bg-[#fafbfc] py-12 px-4 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f0f4ff] text-[#16135c] mb-4 shadow-2xs">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[#16135c]">Sign in to chat with sellers</h2>
          <p className="mt-2 text-xs text-[#5c6c75] leading-relaxed">
            You need to be signed in to your HAAT account to send messages, ask about product availability, and discuss wholesale prices with verified merchants.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login?redirect=/chat"
              className="w-full sm:w-auto inline-flex h-10 items-center justify-center rounded-xl bg-[#16135c] px-6 text-xs font-bold text-white shadow-xs hover:bg-[#12104b] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-xs font-bold text-[#21313c] hover:bg-gray-50 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isBlocked = Boolean(activeConversation?.isBlocked);

  return (
    <div className="bg-[#fafbfc] pb-8">
      {/* 1. Breadcrumb Bar */}
      <div className="border-b border-gray-200/80 bg-white py-2.5">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-[#889397]">
          <Link to="/" className="hover:text-[#16135c] transition-colors">
            Home
          </Link>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="font-semibold text-[#16135c]">Marketplace Chats</span>
          {activeSellerName ? (
            <>
              <ChevronRight size={12} className="text-gray-300" />
              <span className="text-[#21313c] font-medium truncate">{activeSellerName}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* 2. Main Page Content */}
      <div className="mx-auto max-w-container px-4 py-4 md:px-8">
        <div className="flex h-[calc(100vh-175px)] min-h-[600px] max-h-[820px] rounded-2xl border border-[#dfe2e1] bg-white shadow-sm overflow-hidden">
          
          {/* ================= LEFT SIDE: CHAT CONVERSATIONS LIST ================= */}
          <div
            className={`w-full lg:w-[360px] xl:w-[400px] border-r border-[#dfe2e1] flex flex-col bg-[#f8f9fa] shrink-0 ${
              mobileChatOpen ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Header & Search */}
            <div className="p-3.5 border-b border-[#dfe2e1] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#16135c] text-white shadow-2xs">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Chats</h2>
                    <p className="text-[11px] text-[#5c6c75]">
                      {conversations.length} {conversations.length === 1 ? 'Conversation' : 'Conversations'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void fetchConversations()}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#16135c] hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Refresh chats"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingConvs ? 'animate-spin text-[#16135c]' : ''}`} />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#889397]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-xl border border-[#dfe2e1] bg-[#f8f9fa] pl-9 pr-3 py-1.5 text-xs text-[#21313c] placeholder:text-[#889397] focus:border-[#16135c] focus:outline-none focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Checkbox Action Toolbar (Bulk Selection & DB Deletion) */}
            {filteredConversations.length > 0 ? (
              <div className="px-3.5 py-2 text-[11px] border-b border-[#dfe2e1] bg-[#f0f4ff]/60 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#16135c] select-none">
                  <input
                    type="checkbox"
                    checked={
                      filteredConversations.length > 0 &&
                      selectedChatSlugs.length === filteredConversations.length
                    }
                    onChange={handleToggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#16135c] focus:ring-[#16135c] cursor-pointer"
                  />
                  <span>
                    {selectedChatSlugs.length > 0
                      ? `${selectedChatSlugs.length} selected`
                      : 'Select All'}
                  </span>
                </label>

                {selectedChatSlugs.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedChats}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="Permanently delete selected chat(s) from database"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Conversations Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 buyer-scrollbar">
              {isLoadingConvs ? (
                <div className="flex flex-col items-center justify-center p-8 text-xs text-[#889397]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#16135c] mb-2" />
                  <span>Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#889397]">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 text-gray-400 mx-auto mb-3">
                    <MessageSquare size={22} />
                  </div>
                  <h4 className="font-semibold text-gray-700 text-sm">No Conversations</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    You have not started any chats yet. Browse products and click &ldquo;Chat&rdquo; to talk with a seller.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeSellerSlug?.toLowerCase() === conv.sellerSlug.toLowerCase();
                  const isChecked = selectedChatSlugs.includes(conv.sellerSlug);
                  const unreadCount = isSelected ? 0 : conv.unreadCount;
                  const hasUnread = !isSelected && unreadCount > 0;

                  return (
                    <div
                      key={conv.sellerSlug}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full text-left p-3.5 transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-[#f0f4ff] border-l-4 border-l-[#16135c] shadow-2xs'
                          : 'hover:bg-white'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <div
                        className="pt-1.5 shrink-0"
                        onClick={(e) => handleToggleSelectChat(conv.sellerSlug, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-[#16135c] focus:ring-[#16135c] cursor-pointer"
                        />
                      </div>

                      {/* Seller Avatar */}
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#16135c] text-white font-bold text-sm shadow-2xs mt-0.5">
                        {conv.sellerName ? conv.sellerName.charAt(0).toUpperCase() : 'S'}
                        {conv.isBlocked ? (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" title="Blocked" />
                        ) : (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      {/* Conversation Details with WhatsApp-style bold unread */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs truncate ${
                              hasUnread
                                ? 'font-black text-gray-900'
                                : isSelected
                                  ? 'font-bold text-[#16135c]'
                                  : 'font-semibold text-gray-700'
                            }`}
                          >
                            {conv.sellerName}
                          </h4>
                          {conv.lastMessageAt ? (
                            <span
                              className={`text-[10px] shrink-0 ${
                                hasUnread ? 'font-bold text-[#0AAD0A]' : 'text-[#889397]'
                              }`}
                            >
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : null}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {conv.isBlocked ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                              <Ban size={9} /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              <ShieldCheck size={9} /> Verified Seller
                            </span>
                          )}
                        </div>

                        {/* Last Message Snippet + WhatsApp-Style Bold & Unread Badge */}
                        <div className="flex items-center justify-between gap-1 mt-1">
                          <p
                            className={`text-[11px] truncate flex items-center gap-1 ${
                              hasUnread
                                ? 'font-black text-gray-900'
                                : 'font-normal text-gray-500'
                            }`}
                          >
                            <CheckCheck size={12} className={hasUnread ? 'text-[#0AAD0A]' : 'text-gray-400'} />
                            <span className="truncate">{conv.lastMessage || 'No messages yet'}</span>
                          </p>

                          {hasUnread ? (
                            <span className="grid h-5 min-w-5 px-1.5 place-items-center rounded-full bg-[#0AAD0A] text-white text-[10px] font-bold shadow-2xs shrink-0 leading-none">
                              {unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= RIGHT SIDE: ACTIVE MESSAGES & CONVERSATION ================= */}
          <div
            className={`flex-1 flex flex-col bg-white overflow-hidden ${
              mobileChatOpen ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {activeSellerSlug ? (
              <>
                {/* WhatsApp-Style Selection Bar or Conversation Header Bar */}
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
                  <div className="p-3.5 border-b border-[#dfe2e1] flex items-center justify-between gap-3 bg-white shadow-2xs shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mobile Back Button to return to Chats list */}
                      <button
                        type="button"
                        onClick={() => setMobileChatOpen(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#16135c] hover:bg-gray-100 lg:hidden cursor-pointer"
                        title="Back to Chats List"
                      >
                        <ArrowLeft size={18} />
                      </button>

                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#16135c] text-white font-bold text-sm shadow-2xs">
                        {activeSellerName ? activeSellerName.charAt(0).toUpperCase() : 'S'}
                        {isBlocked ? (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                        ) : (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#16135c] truncate">
                            {activeSellerName || activeSellerSlug}
                          </h3>
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <Ban size={10} /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck size={11} /> Verified Seller
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5c6c75] font-medium flex items-center gap-1 mt-0.5">
                          {isBlocked ? (
                            <span className="text-red-600 font-semibold">Messaging is blocked</span>
                          ) : (
                            <span>Verified Merchant Partner</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Header Actions: Block/Unblock Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Block / Unblock Toggle */}
                      {isBlocked ? (
                        <button
                          type="button"
                          onClick={handleUnblockChat}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                          title="Unblock this conversation"
                        >
                          <Unlock size={13} />
                          <span>Unblock</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleBlockChat}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                          title="Block this conversation"
                        >
                          <Ban size={13} />
                          <span>Block</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Attached Product Context Banner (if user navigated from a product card) */}
                {hasAttachedProduct ? (
                  <div className="border-b border-[#dfe2e1] bg-[#f0f4ff]/80 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {paramProductImage ? (
                        <img
                          src={paramProductImage}
                          alt={paramProductTitle || 'Product'}
                          className="h-10 w-10 shrink-0 rounded-lg border border-blue-200 object-cover bg-white"
                        />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-blue-200 bg-white text-[#16135c]">
                          <ShoppingBag size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                            Discussing Product
                          </span>
                          {paramProductPrice ? (
                            <span className="text-xs font-bold text-[#16135c]">
                              {money(Number(paramProductPrice))}
                            </span>
                          ) : null}
                          {paramProductSku ? (
                            <span className="text-[11px] text-[#889397] font-mono">
                              SKU: {paramProductSku}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs font-semibold text-[#16135c] truncate mt-0.5">
                          {paramProductTitle}
                        </p>
                      </div>
                    </div>

                    {paramProductId ? (
                      <Link
                        to={`/product/${paramProductId}`}
                        className="shrink-0 text-xs font-semibold text-[#16135c] hover:underline hidden sm:block"
                      >
                        View Listing →
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {/* Blocked Warning Banner */}
                {isBlocked ? (
                  <div className="border-b border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2.5 text-xs text-red-800 shrink-0">
                    <AlertTriangle size={16} className="text-red-600 shrink-0" />
                    <p className="leading-tight">
                      <strong>This conversation is blocked.</strong> Neither party can send or receive messages while blocked.
                    </p>
                  </div>
                ) : null}

                {/* Messages Viewport */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col space-y-4 bg-[#fafbfc] buyer-scrollbar"
                >
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-6 text-xs text-[#889397]">
                      <Loader2 size={18} className="animate-spin text-[#16135c] mr-2" />
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#889397] my-auto">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 text-gray-400 mx-auto mb-3">
                        <MessageSquare size={20} />
                      </div>
                      <p className="font-semibold text-gray-700 text-sm">No messages yet</p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Click a quick inquiry card below to send your contact info directly, or type your message.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isBuyer = msg.sender === 'BUYER';
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
                          className={`relative flex flex-col ${isBuyer ? 'items-end' : 'items-start'} ${
                            isMsgSelected
                              ? 'bg-emerald-500/10 -mx-3 px-3 py-1 rounded-xl transition-colors'
                              : 'transition-colors'
                          } ${isSelectionMode ? 'cursor-pointer select-none' : 'select-none'}`}
                        >
                          {/* Custom Quote Card or Standard Message Bubble */}
                          {msg.isQuote ? (
                            (() => {
                              const isQuoteOrdered =
                                msg.quoteStatus === 'ORDERED' ||
                                (Boolean(msg._id) && redeemedQuoteIds.includes(String(msg._id)));

                              return (
                                <div className="relative rounded-2xl border border-gray-200/90 bg-white p-4 text-xs shadow-2xs max-w-[90%] sm:max-w-md w-full space-y-3 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#16135c] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                      <Sparkles size={11} className="text-[#0AAD0A]" /> Official Custom Quote
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                        isQuoteOrdered
                                          ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                          : 'text-[#16135c] bg-blue-50/70 border-blue-200'
                                      }`}
                                    >
                                      {isQuoteOrdered ? 'Order Completed' : 'Agreed Final Price'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {msg.productImage ? (
                                      <img
                                        src={msg.productImage}
                                        alt=""
                                        className="h-14 w-14 rounded-xl object-cover border border-gray-200 bg-white shrink-0"
                                      />
                                    ) : (
                                      <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-50 border border-blue-200 text-[#16135c] shrink-0">
                                        <ShoppingBag size={22} />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-bold text-[#16135c] uppercase tracking-wide block">
                                        {msg.sellerName || activeSellerName}
                                      </span>
                                      <p className="text-xs font-bold text-gray-900 truncate">{msg.productTitle || 'Product'}</p>
                                      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                                        <span className="text-base font-black text-[#16135c]">
                                          {money(msg.quotePricePaise || 0)}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-medium">/ unit</span>
                                        {msg.productPricePaise && msg.quotePricePaise && msg.quotePricePaise < msg.productPricePaise && (
                                          <span className="text-[11px] text-gray-400 line-through">
                                            {money(msg.productPricePaise)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Agreed Qty and Total */}
                                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-gray-50/80 border border-gray-200/80 text-center">
                                    <div className="border-r border-gray-200 pr-2">
                                      <span className="block text-[10px] text-gray-500 font-medium">Agreed Quantity</span>
                                      <span className="block text-xs font-bold text-[#16135c]">{msg.quoteQuantity || 1} units</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-gray-500 font-medium">Total Quote Value</span>
                                      <span className="block text-xs font-black text-[#16135c]">{money(msg.quoteTotalPricePaise || 0)}</span>
                                    </div>
                                  </div>

                                  {msg.quoteNotes && (
                                    <p className="text-[11px] text-[#5c6c75] bg-gray-50 border border-gray-100 p-2 rounded-lg italic">
                                      Note: {msg.quoteNotes}
                                    </p>
                                  )}

                                  {/* Key Action: Add to Cart with Custom Quote */}
                                  {isQuoteOrdered ? (
                                    <button
                                      type="button"
                                      disabled={true}
                                      className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-400 text-xs font-bold cursor-not-allowed opacity-80"
                                    >
                                      <CheckCircle2 size={15} className="text-emerald-600" />
                                      <span>Order Completed (Quote Redeemed)</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        addProductToCart({
                                          productId: msg.productId || 'custom-item',
                                          title: msg.productTitle || 'Custom Quoted Product',
                                          pricePaise: msg.quotePricePaise || msg.productPricePaise || 0,
                                          quantity: msg.quoteQuantity || 1,
                                          image: msg.productImage,
                                          sellerSlug: msg.sellerSlug,
                                          isCustomQuote: true,
                                          quoteMessageId: msg._id,
                                          originalPricePaise: msg.productPricePaise || undefined,
                                          customQuoteNotes: `Custom Quote: ₹${((msg.quotePricePaise || 0) / 100).toFixed(2)} / unit (${msg.quoteQuantity || 1} units)`,
                                        });
                                        showToast.success(
                                          'Custom Quote Added to Cart!',
                                          `${msg.quoteQuantity || 1}x ${msg.productTitle || 'Item'} @ ₹${((msg.quotePricePaise || 0) / 100).toFixed(2)}/unit`,
                                        );
                                        navigate('/cart');
                                      }}
                                      className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer group"
                                    >
                                      <ShoppingBag size={15} className="group-hover:scale-105 transition-transform" />
                                      <span>Add to Cart (Custom Quote Price)</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div
                              className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs shadow-2xs leading-relaxed transition-all ${
                                isMsgSelected
                                  ? 'ring-2 ring-[#0AAD0A] ring-offset-2 scale-[1.01]'
                                  : ''
                              } ${
                                isBuyer
                                  ? 'bg-[#16135c] text-white rounded-tr-xs'
                                  : 'bg-white border border-[#dfe2e1] text-[#21313c] rounded-tl-xs'
                              }`}
                            >
                              {/* Selected Checkmark Badge (WhatsApp-Style) */}
                              {isMsgSelected && (
                                <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#0AAD0A] text-white flex items-center justify-center shadow-xs z-10 animate-in zoom-in-75 duration-150">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}

                              {!isBuyer ? (
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#16135c] mb-1">
                                  {msg.sellerName || activeSellerName}
                                </span>
                              ) : null}

                              {/* Attached Product on message */}
                              {msg.productTitle && !isBuyer ? (
                                <div className="mb-2 p-2 rounded-xl bg-gray-50 border border-gray-100 text-[#21313c] flex items-center gap-2">
                                  {msg.productImage ? (
                                    <img
                                      src={msg.productImage}
                                      alt=""
                                      className="h-8 w-8 rounded-lg object-cover"
                                    />
                                  ) : null}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold truncate">{msg.productTitle}</p>
                                    {msg.productPricePaise ? (
                                      <p className="text-[10px] text-emerald-700 font-semibold">
                                        {money(msg.productPricePaise)}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}

                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          )}
                          <span className="mt-1 text-[10px] text-[#889397] px-1">
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

                {/* Quick Inquiry Small Text Cards */}
                {!isBlocked && (
                  <div className="border-t border-[#dfe2e1] bg-[#f8fafc]/95 px-3.5 py-2.5 shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#16135c]">
                        <Sparkles size={13} className="text-amber-500" />
                        <span>Quick Inquiries (1-Click Direct Send with Contact Details)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <button
                          type="button"
                          onClick={() => scrollCards('left')}
                          className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-[#16135c] transition-colors cursor-pointer"
                          title="Scroll Left"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollCards('right')}
                          className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-[#16135c] transition-colors cursor-pointer"
                          title="Scroll Right"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={cardsEmblaRef}
                      className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
                    >
                      <div className="flex gap-2.5 pb-1">
                        {quickInquiryCards.map((card) => {
                          const IconComponent = card.icon;
                          return (
                            <button
                              key={card.id}
                              type="button"
                              disabled={isSending}
                              onClick={() => onCardClick(card)}
                              className="shrink-0 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/60 hover:border-[#16135c]/40 active:scale-[0.98] px-3 py-2 text-left cursor-pointer shadow-2xs hover:shadow-xs transition-all select-none group min-w-[210px] max-w-[270px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0f4ff] text-[#16135c] group-hover:bg-[#16135c] group-hover:text-white transition-colors">
                                <IconComponent size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold text-[#16135c] group-hover:text-[#12104b] truncate">
                                    {card.title}
                                  </span>
                                  <Send size={11} className="text-gray-400 group-hover:text-[#0AAD0A] shrink-0 transition-colors" />
                                </div>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                  {card.subtitle}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Message Input Bar */}
                <div className="border-t border-[#dfe2e1] bg-white p-3.5 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isBlocked || isSending}
                      placeholder={
                        isBlocked
                          ? 'This conversation is blocked. Messaging is disabled.'
                          : `Message ${activeSellerName || 'seller'}...`
                      }
                      className="flex-1 h-11 rounded-xl border border-[#dfe2e1] px-4 text-xs text-[#21313c] placeholder:text-[#889397] focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={isBlocked || isSending || !inputText.trim()}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white px-5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs shrink-0"
                      title={isBlocked ? 'Chat is blocked' : 'Send message'}
                    >
                      {isSending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send size={14} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Empty state if no conversation is selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fafbfc]">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-[#16135c] mb-4 shadow-2xs">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Select a Conversation</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm leading-relaxed">
                  Choose a chat from the left or browse products to initiate an inquiry with a verified seller.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
