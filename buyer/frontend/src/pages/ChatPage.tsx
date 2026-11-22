import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  Phone,
  Mail,
  Copy,
  Check,
  ArrowLeft,
  PhoneCall,
  Clock,
  MapPin,
  CheckCheck,
} from 'lucide-react';
import { api, money, showToast, createSocketClient } from '@haat/shared-frontend';
import { useAuth } from '../features/auth/AuthProvider';

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
}

export interface SellerContactInfo {
  slug: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  isVerified: boolean;
  responseSpeed: string;
  location: string;
  lastActiveSnippet: string;
}

export const MARKETPLACE_SELLERS: SellerContactInfo[] = [
  {
    slug: 'abcd-store',
    name: 'ABCD Store',
    category: 'Grocery, Snacks & Staples',
    phone: '+91 98765 43210',
    email: 'contact@abcdstore.in',
    isVerified: true,
    responseSpeed: 'Typically replies in 5 minutes',
    location: 'Delhi NCR',
    lastActiveSnippet: 'Hello! Welcome to ABCD Store. How can we help you?',
  },
  {
    slug: 'demo-1',
    name: 'Demo 1 FMCG Store',
    category: 'Packaged Foods & Cereals',
    phone: '+91 98123 45678',
    email: 'orders@demofmcg.in',
    isVerified: true,
    responseSpeed: 'Typically replies in 15 minutes',
    location: 'Mumbai',
    lastActiveSnippet: 'All breakfast cereals and grains are currently in fresh stock.',
  },
  {
    slug: 'demo-2',
    name: 'Demo 2 Wholesale',
    category: 'Beverages & Bulk Confectionery',
    phone: '+91 98234 56789',
    email: 'wholesale@demo2.in',
    isVerified: true,
    responseSpeed: 'Typically replies within 1 hour',
    location: 'Bengaluru',
    lastActiveSnippet: 'Bulk wholesale tiers available starting from 10+ units.',
  },
  {
    slug: 'demo-seller',
    name: 'Verified Merchant Partner',
    category: 'Daily Essentials & Spices',
    phone: '+91 98345 67890',
    email: 'support@verifiedmerchant.haat.in',
    isVerified: true,
    responseSpeed: 'Typically replies in 10 minutes',
    location: 'All India',
    lastActiveSnippet: 'Ready for scheduled morning slot deliveries.',
  },
];

function getSeller(slug: string, name?: string): SellerContactInfo {
  const normalized = (slug || 'abcd-store').trim().toLowerCase();
  const found = MARKETPLACE_SELLERS.find((s) => s.slug === normalized);
  if (found) {
    if (name && found.name !== name && name !== 'Verified Seller') {
      return { ...found, name };
    }
    return found;
  }
  const safeName = name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    slug: normalized,
    name: safeName,
    category: 'Verified Marketplace Seller',
    phone: '+91 98765 43210',
    email: `contact@${normalized || 'seller'}.haat.in`,
    isVerified: true,
    responseSpeed: 'Typically replies in minutes',
    location: 'Verified Merchant Hub',
    lastActiveSnippet: `Welcome to ${safeName}. How can we assist you?`,
  };
}

const QUICK_INQUIRIES = [
  'Is this item available in stock?',
  'Can I schedule delivery for tomorrow?',
  'Do you offer bulk wholesale rates?',
  'What is the delivery timeline?',
];

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);

  // URL Query Parameters
  const paramSellerSlug = searchParams.get('seller');
  const paramSellerName = searchParams.get('sellerName');
  const paramProductId = searchParams.get('productId');
  const paramProductTitle = searchParams.get('productTitle');
  const paramProductSku = searchParams.get('sku');
  const paramProductImage = searchParams.get('productImage');
  const paramProductPrice = searchParams.get('price');

  const hasAttachedProduct = Boolean(paramProductId || paramProductTitle);

  // Active seller state
  const [activeSellerSlug, setActiveSellerSlug] = useState<string>(
    paramSellerSlug || MARKETPLACE_SELLERS[0].slug,
  );
  const [activeSellerName, setActiveSellerName] = useState<string>(
    paramSellerName || MARKETPLACE_SELLERS[0].name,
  );

  // Mobile navigation state (on mobile: list vs chat thread)
  const [mobileChatOpen, setMobileChatOpen] = useState<boolean>(() => {
    return Boolean(paramSellerSlug || hasAttachedProduct);
  });

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top of window on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Current active seller contact
  const activeSeller = useMemo(
    () => getSeller(activeSellerSlug, activeSellerName),
    [activeSellerSlug, activeSellerName],
  );

  // Sync state with URL params
  useEffect(() => {
    if (paramSellerSlug) {
      setActiveSellerSlug(paramSellerSlug);
      if (paramSellerName) {
        setActiveSellerName(paramSellerName);
      } else {
        const s = getSeller(paramSellerSlug);
        setActiveSellerName(s.name);
      }
      setMobileChatOpen(true);
    }
  }, [paramSellerSlug, paramSellerName]);

  // Combine default sellers with any dynamic product seller
  const allSellers = useMemo(() => {
    const list = [...MARKETPLACE_SELLERS];
    if (activeSellerSlug && !list.some((s) => s.slug === activeSellerSlug)) {
      list.unshift(activeSeller);
    }
    return list;
  }, [activeSellerSlug, activeSeller]);

  // Filter sellers by search input
  const filteredSellers = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return allSellers;
    return allSellers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.phone.includes(query),
    );
  }, [allSellers, searchFilter]);

  // Fetch real messages for the active seller
  const fetchMessages = async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await api.get<{ messages?: ChatMessageItem[]; data?: { messages?: ChatMessageItem[] } }>(
        `/chat/messages?seller=${encodeURIComponent(activeSellerSlug)}`,
      );
      const list = res.data?.data?.messages ?? res.data?.messages ?? [];
      setMessages(list);
    } catch {
      setMessages([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMessages();

    // 1. Attach real-time Socket.IO connection for instant sub-second delivery
    const socket = createSocketClient({
      url: window.location.origin.includes('localhost') ? 'http://localhost:4000' : undefined,
    });

    socket.emit('join_chat', { sellerSlug: activeSellerSlug });

    socket.on('new_message', (incoming: ChatMessageItem) => {
      if (incoming.sellerSlug.toLowerCase() === activeSellerSlug.toLowerCase()) {
        setMessages((prev) => {
          if (prev.some((m) => m._id && incoming._id && m._id === incoming._id)) return prev;
          return [...prev, incoming];
        });
      }
    });

    // 2. Continuous silent sync loop (every 2.5s) to guarantee messages arrive even during websocket reconnects
    const pollTimer = setInterval(() => {
      void fetchMessages(true);
    }, 2500);

    // 3. Instant sync whenever customer refocuses the browser window/tab
    const handleFocus = () => {
      void fetchMessages(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      socket.emit('leave_chat', { sellerSlug: activeSellerSlug });
      socket.disconnect();
    };
  }, [activeSellerSlug, isAuthenticated]);

  // Constrain auto-scrolling to the internal messages container (never jump browser window)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, activeSellerSlug]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast.success('Copied to Clipboard', text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSelectSeller = (seller: SellerContactInfo) => {
    setActiveSellerSlug(seller.slug);
    setActiveSellerName(seller.name);
    setMobileChatOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('view');
      next.set('seller', seller.slug);
      next.set('sellerName', seller.name);
      return next;
    });
  };

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending || !isAuthenticated) return;

    setInputText('');
    setIsSending(true);

    const priceNum = paramProductPrice ? Number(paramProductPrice) : null;
    const newMsg: ChatMessageItem = {
      sellerSlug: activeSellerSlug,
      sellerName: activeSeller.name,
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

    setMessages((prev) => [...prev, newMsg]);

    try {
      await api.post('/chat/messages', {
        sellerSlug: activeSellerSlug,
        sellerName: activeSeller.name,
        buyerName: user?.fullName || 'Customer',
        buyerId: user?.id || null,
        text,
        productId: paramProductId || null,
        productTitle: paramProductTitle || null,
        productImage: paramProductImage || null,
        productPricePaise: Number.isFinite(priceNum) ? priceNum : null,
      });
      void fetchMessages(true);
    } catch {
      showToast.error('Message failed', 'Unable to send message. Please try again.');
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

  // If user is not authenticated, show sign-in gate
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
          <ChevronRight size={12} className="text-gray-300" />
          <span className="text-[#21313c] font-medium truncate">{activeSeller.name}</span>
        </div>
      </div>

      {/* 2. Main Page Content */}
      <div className="mx-auto max-w-container px-4 py-4 md:px-8">
        {/* WhatsApp-Style Unified Split Layout */}
        <div className="flex h-[calc(100vh-175px)] min-h-[600px] max-h-[820px] rounded-2xl border border-[#dfe2e1] bg-white shadow-sm overflow-hidden">
          
          {/* ================= LEFT SIDE: SENDERS / CHATS LIST ================= */}
          <div
            className={`w-full lg:w-[360px] xl:w-[400px] border-r border-[#dfe2e1] flex flex-col bg-[#f8f9fa] shrink-0 ${
              mobileChatOpen ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Senders Header Bar */}
            <div className="p-3.5 border-b border-[#dfe2e1] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#16135c] text-white shadow-2xs">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Chats</h2>
                    <p className="text-[11px] text-[#5c6c75]">
                      {filteredSellers.length} Verified Sellers
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void fetchMessages()}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#16135c] hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Refresh chats"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#16135c]' : ''}`} />
                </button>
              </div>

              {/* Search Senders Input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#889397]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search sellers or chats..."
                  className="w-full rounded-xl border border-[#dfe2e1] bg-[#f8f9fa] pl-9 pr-3 py-1.5 text-xs text-[#21313c] placeholder:text-[#889397] focus:border-[#16135c] focus:outline-none focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Senders List Header Label */}
            <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[#889397] flex items-center justify-between bg-[#f8f9fa]">
              <span>ALL SENDERS</span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All Online
              </span>
            </div>

            {/* Senders Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 buyer-scrollbar">
              {filteredSellers.map((seller) => {
                const isSelected = activeSellerSlug === seller.slug;
                return (
                  <button
                    key={seller.slug}
                    type="button"
                    onClick={() => handleSelectSeller(seller)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#f0f4ff] border-l-4 border-l-[#16135c] shadow-2xs'
                        : 'hover:bg-white'
                    }`}
                  >
                    {/* Seller Avatar */}
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#16135c] text-white font-bold text-sm shadow-2xs mt-0.5">
                      {seller.name.charAt(0).toUpperCase()}
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    {/* Seller Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            isSelected ? 'font-black text-[#16135c]' : 'font-bold text-[#21313c]'
                          }`}
                        >
                          {seller.name}
                        </h4>
                        <span className="text-[10px] text-[#889397] shrink-0 font-medium">
                          {isSelected ? 'Active' : 'Online'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          <CheckCircle2 size={9} /> Verified
                        </span>
                        <span className="text-[11px] text-[#5c6c75] truncate">
                          • {seller.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#889397] truncate mt-1 flex items-center gap-1">
                        <CheckCheck size={12} className="text-[#16135c]/60 shrink-0" />
                        <span className="truncate">&ldquo;{seller.lastActiveSnippet}&rdquo;</span>
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredSellers.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#889397]">
                  No sellers found matching &ldquo;{searchFilter}&rdquo;
                </div>
              ) : null}
            </div>
          </div>

          {/* ================= RIGHT SIDE: ACTIVE MESSAGES & CONVERSATION ================= */}
          <div
            className={`flex-1 flex-col bg-white overflow-hidden ${
              mobileChatOpen ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Conversation Header Bar */}
            <div className="p-3.5 border-b border-[#dfe2e1] flex items-center justify-between gap-3 bg-white shadow-2xs shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button to return to Senders list */}
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-[#16135c] hover:bg-gray-100 lg:hidden cursor-pointer"
                  title="Back to Senders List"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#16135c] text-white font-bold text-sm shadow-2xs">
                  {activeSeller.name.charAt(0).toUpperCase()}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#16135c] truncate">{activeSeller.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck size={11} /> Verified Seller
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online • {activeSeller.responseSpeed}</span>
                  </p>
                </div>
              </div>

              {/* Direct Hotline Actions (Call, Email, Store) */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${activeSeller.phone}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  title={`Call ${activeSeller.phone}`}
                >
                  <Phone size={13} />
                  <span className="hidden sm:inline">Call</span>
                </a>
                <a
                  href={`mailto:${activeSeller.email}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs"
                  title={`Email ${activeSeller.email}`}
                >
                  <Mail size={13} />
                  <span className="hidden sm:inline">Email</span>
                </a>
                <Link
                  to={`/store/${activeSeller.slug}`}
                  className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-[#16135c] hover:underline ml-1"
                >
                  <span>Store</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

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

            {/* Messages Viewport */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col space-y-4 bg-[#fafbfc] buyer-scrollbar"
            >
              {/* Official Verified Seller Welcome & Direct Hotline Card */}
              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-2xs max-w-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#16135c]">
                    {activeSeller.name}
                  </span>
                  <span className="text-[10px] text-[#889397] bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                    Verified Merchant Welcome
                  </span>
                </div>

                <p className="text-xs text-[#21313c] leading-relaxed">
                  Hello! Welcome to <strong className="font-semibold text-[#16135c]">{activeSeller.name}</strong>. How can we help you with our products or delivery today?
                </p>

                {/* Direct Seller Contact Details (Phone & Email to contact directly without chat) */}
                <div className="mt-3.5 pt-3 border-t border-gray-100 rounded-xl bg-gradient-to-r from-[#f8f9fa] to-blue-50/50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <PhoneCall size={13} className="text-[#16135c]" />
                      <span className="text-[11px] font-bold text-[#16135c]">
                        Contact Seller Directly (Without Chat):
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded-full">
                      Instant Response
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5c6c75] mb-3 leading-relaxed">
                    Prefer an immediate phone discussion or direct email for urgent wholesale pricing, bulk orders, or scheduled deliveries?
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Call Button */}
                    <a
                      href={`tel:${activeSeller.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#16135c] text-white px-3.5 py-2 text-xs font-bold hover:bg-[#12104b] transition-colors shadow-2xs cursor-pointer"
                    >
                      <Phone size={13} />
                      <span>Call: {activeSeller.phone}</span>
                    </a>

                    {/* Email Button */}
                    <a
                      href={`mailto:${activeSeller.email}?subject=Product%20Inquiry%20from%20HAAT:%20${encodeURIComponent(paramProductTitle || 'Catalog Inquiry')}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white text-[#21313c] px-3.5 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs"
                    >
                      <Mail size={13} className="text-[#16135c]" />
                      <span>Email: {activeSeller.email}</span>
                    </a>

                    {/* Copy Phone Pill */}
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSeller.phone, 'phone')}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-medium text-gray-600 hover:text-[#16135c] hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedField === 'phone' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedField === 'phone' ? 'Copied' : 'Copy Phone'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Message History */}
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-[#889397]">
                  <Loader2 size={18} className="animate-spin text-[#16135c] mr-2" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#889397]">
                  <span>No other messages yet. Type below to chat with {activeSeller.name} or reach them directly above.</span>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isBuyer = msg.sender === 'BUYER';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs shadow-2xs leading-relaxed ${
                          isBuyer
                            ? 'bg-[#16135c] text-white rounded-tr-xs'
                            : 'bg-white border border-[#dfe2e1] text-[#21313c] rounded-tl-xs'
                        }`}
                      >
                        {!isBuyer ? (
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#16135c] mb-1">
                            {msg.sellerName || activeSeller.name}
                          </span>
                        ) : null}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
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

            {/* Quick Inquiry Prompts Chips */}
            <div className="border-t border-[#dfe2e1] bg-white px-4 py-2.5 overflow-x-auto flex gap-2 scrollbar-none shrink-0">
              {QUICK_INQUIRIES.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSendMessage(q)}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1 text-xs font-medium text-[#16135c] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  <Sparkles size={12} className="text-amber-500" />
                  <span>{q}</span>
                </button>
              ))}
            </div>

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
                  placeholder={`Message ${activeSeller.name}...`}
                  className="flex-1 h-11 rounded-xl border border-[#dfe2e1] px-4 text-xs text-[#21313c] placeholder:text-[#889397] focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white px-5 text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer shadow-xs shrink-0"
                  title="Send message"
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
          </div>
        </div>
      </div>
    </div>
  );
}
