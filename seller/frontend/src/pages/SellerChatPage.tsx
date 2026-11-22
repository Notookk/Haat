import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  User,
  ShoppingBag,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import {
  api,
  money,
  showToast,
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
  createdAt?: string;
}

const QUICK_RESPONSES = [
  'Yes, this item is fresh, in stock, and ready to ship!',
  'We offer scheduled delivery for tomorrow morning.',
  'Bulk wholesale pricing applies on orders of 10+ units.',
  'Thank you for reaching out! How can we assist you today?',
];

export function SellerChatPage() {
  const { seller } = useSellerAuth();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll seller messages every 2 seconds for continuous live synchronization
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['seller', 'chat', 'messages'],
    queryFn: async () => {
      const res = await api.get<{ messages: ChatMessage[] }>('/api/v1/seller/chat/messages');
      return res.data.messages || [];
    },
    refetchInterval: 2000,
  });

  const messages: ChatMessage[] = data || [];

  // Group messages by buyer name
  const buyerGroups = messages.reduce<Record<string, ChatMessage[]>>((acc, msg) => {
    const name = msg.buyerName || 'Customer';
    if (!acc[name]) acc[name] = [];
    acc[name].push(msg);
    return acc;
  }, {});

  // Sort buyers so the most recently active customer inquiry is always at the top
  const buyerList = Object.keys(buyerGroups).sort((a, b) => {
    const msgsA = buyerGroups[a];
    const msgsB = buyerGroups[b];
    const timeA = msgsA[msgsA.length - 1]?.createdAt ? new Date(msgsA[msgsA.length - 1].createdAt!).getTime() : 0;
    const timeB = msgsB[msgsB.length - 1]?.createdAt ? new Date(msgsB[msgsB.length - 1].createdAt!).getTime() : 0;
    return timeB - timeA;
  });

  // Auto-select the most recently active buyer if none selected
  useEffect(() => {
    if (!selectedBuyer && buyerList.length > 0) {
      setSelectedBuyer(buyerList[0]);
    }
  }, [buyerList, selectedBuyer]);

  // Real-time bidirectional socket connection for instant chat delivery
  useEffect(() => {
    const socket = createSocketClient({
      url: window.location.origin.includes('localhost') ? 'http://localhost:7100' : undefined,
    });

    if (seller?.storeSlug) {
      socket.emit('join_chat', { sellerSlug: seller.storeSlug });
    }

    socket.on('new_message', (incoming: ChatMessage) => {
      // Invalidate queries immediately so message pops up with zero latency
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
      // If incoming message is from a buyer, auto-select them so the seller immediately sees their inquiry
      if (incoming.sender === 'BUYER' && incoming.buyerName) {
        setSelectedBuyer(incoming.buyerName);
      }
    });

    return () => {
      if (seller?.storeSlug) {
        socket.emit('leave_chat', { sellerSlug: seller.storeSlug });
      }
      socket.disconnect();
    };
  }, [seller?.storeSlug, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedBuyer]);

  const activeMessages = selectedBuyer ? buyerGroups[selectedBuyer] || [] : [];
  const latestMessageWithProduct = [...activeMessages].reverse().find((m) => m.productTitle);

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const payload = {
        text,
        buyerName: selectedBuyer || 'Customer',
        productId: latestMessageWithProduct?.productId || null,
        productTitle: latestMessageWithProduct?.productTitle || null,
      };
      const res = await api.post<{ message: ChatMessage }>('/api/v1/seller/chat/messages', payload);
      return res.data.message;
    },
    onSuccess: () => {
      setInputText('');
      void queryClient.invalidateQueries({ queryKey: ['seller', 'chat', 'messages'] });
    },
    onError: () => {
      showToast.error('Message failed', 'Unable to send message. Please try again.');
    },
  });

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(trimmed);
  };

  const handleQuickChip = (chip: string) => {
    sendMessageMutation.mutate(chip);
  };

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
            Real-time chat with buyers asking about your products, stock availability, and scheduled deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs hover:bg-surface-sunken transition-colors cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-brand-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[460px] w-full">
          <RefreshCw className="h-8 w-8 text-brand-600 animate-spin mb-3" />
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
            onClick={() => void refetch()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#16135c] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#12104b] transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
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
                placeholder="Search customers or inquiries..."
                className="w-full rounded-lg border border-line bg-surface-sunken pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-line admin-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center text-caption text-ink-400">Loading customer inquiries...</div>
            ) : buyerList.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 mb-3">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-ink-800">No Inquiries Yet</h3>
                <p className="mt-1 text-xs text-ink-500">
                  When buyers click &ldquo;Chat&rdquo; on your product listings, their questions will appear here.
                </p>
              </div>
            ) : (
              buyerList
                .filter((name) => name.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((name) => {
                  const msgs = buyerGroups[name];
                  const lastMsg = msgs[msgs.length - 1];
                  const isSelected = selectedBuyer === name;
                  const hasProduct = msgs.some((m) => m.productTitle);

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedBuyer(name)}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                        isSelected ? 'bg-surface border-l-4 border-l-brand-600 shadow-2xs' : 'hover:bg-surface/80'
                      }`}
                    >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold text-xs">
                        {name.charAt(0).toUpperCase()}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-xs font-bold text-ink-900 truncate">{name}</h4>
                            {lastMsg.sender === 'BUYER' && (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                                New
                              </span>
                            )}
                          </div>
                          {lastMsg.createdAt ? (
                            <span className="text-[10px] text-ink-400 shrink-0">
                              {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-ink-500 truncate mb-1">
                          {lastMsg.sender === 'SELLER' ? 'You: ' : ''}
                          {lastMsg.text}
                        </p>

                        {hasProduct ? (
                          <div className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                            <ShoppingBag className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[140px]">
                              {msgs.find((m) => m.productTitle)?.productTitle}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Main Area: Active Chat Window */}
        <div className="flex-1 flex flex-col bg-surface min-w-0 overflow-hidden">
          {selectedBuyer ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 border-b border-line flex items-center justify-between gap-3 bg-surface">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-xs">
                    {selectedBuyer.charAt(0).toUpperCase()}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-ink-900 truncate">{selectedBuyer}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active Buyer
                      </span>
                      {buyerList.length > 1 && (
                        <select
                          value={selectedBuyer || ''}
                          onChange={(e) => setSelectedBuyer(e.target.value)}
                          className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-1.5 py-0.5 cursor-pointer"
                          title="Switch active buyer inquiry thread"
                        >
                          {buyerList.map((bName) => (
                            <option key={bName} value={bName}>
                              Thread: {bName} {buyerGroups[bName]?.[buyerGroups[bName].length - 1]?.sender === 'BUYER' ? '★' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      Store: <span className="font-semibold text-ink-700">{seller?.storeName || 'My Store'}</span>
                    </p>
                  </div>
                </div>

                {/* Attached Product Badge if customer inquired about a specific item */}
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
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] admin-scrollbar">
                {activeMessages.map((msg, idx) => {
                  const isMe = msg.sender === 'SELLER';
                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
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

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs shadow-2xs max-w-md ${
                          isMe
                            ? 'bg-[#16135c] text-white rounded-br-none'
                            : 'bg-white border border-[#dfe2e1] text-[#21313c] rounded-bl-none'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>

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
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Chips */}
              <div className="border-t border-line bg-surface p-2 px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-ink-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Quick Reply:
                </span>
                {QUICK_RESPONSES.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickChip(chip)}
                    disabled={sendMessageMutation.isPending}
                    className="shrink-0 rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-ink-700 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-line bg-surface">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Reply to ${selectedBuyer}...`}
                    disabled={sendMessageMutation.isPending}
                    className="flex-1 rounded-xl border border-line bg-surface-sunken px-3.5 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sendMessageMutation.isPending}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-xs hover:bg-brand-700 disabled:opacity-40 transition-colors cursor-pointer"
                    title="Send Message"
                  >
                    <Send className="h-4 w-4" />
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
