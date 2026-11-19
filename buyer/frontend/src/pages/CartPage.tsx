import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Clock,
  Calendar,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Check,
} from 'lucide-react';
import {
  useCartItems,
  updateCartQuantity,
  removeCartItem,
  clearCart,
} from '../features/chat/chatStore';
import { money, showToast } from '@haat/shared-frontend';

export interface DynamicDeliverySlot {
  id: string;
  dayOffset: number; // 1 = Tomorrow, 2 = Day After, 3 = Day 3
  dayLabel: string; // e.g. "Tomorrow" | "Saturday" | "Sunday"
  dateShort: string; // e.g. "Nov 21"
  dateFull: string; // e.g. "Fri, 21 Nov"
  timeRange: string; // e.g. "09:00 AM – 12:00 PM"
  period: 'Morning' | 'Afternoon' | 'Evening';
  badge: string; // "Fastest Delivery" | "Recommended" | "Available"
  badgeColor: string;
  displayLabel: string;
}

function getDynamicDeliveryDays() {
  const days: { offset: number; dayLabel: string; dateShort: string; dateFull: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayLabel =
      i === 1 ? 'Tomorrow' : i === 2 ? 'Day After Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'long' });
    const dateShort = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const dateFull = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    days.push({ offset: i, dayLabel, dateShort, dateFull });
  }
  return days;
}

function getDynamicDeliverySlots(): DynamicDeliverySlot[] {
  const days = getDynamicDeliveryDays();
  const slots: DynamicDeliverySlot[] = [];

  days.forEach(({ offset, dayLabel, dateShort, dateFull }) => {
    // 1. Morning Slot
    slots.push({
      id: `slot-${offset}-morning`,
      dayOffset: offset,
      dayLabel,
      dateShort,
      dateFull,
      timeRange: '09:00 AM – 12:00 PM',
      period: 'Morning',
      badge: offset === 1 ? 'Fastest Delivery' : 'Available',
      badgeColor:
        offset === 1
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : 'bg-gray-100 text-gray-700 border-gray-200',
      displayLabel: `${dayLabel} (${dateFull}) • Morning (09:00 AM – 12:00 PM)`,
    });

    // 2. Afternoon Slot
    slots.push({
      id: `slot-${offset}-afternoon`,
      dayOffset: offset,
      dayLabel,
      dateShort,
      dateFull,
      timeRange: '12:00 PM – 03:00 PM',
      period: 'Afternoon',
      badge: offset === 1 ? 'Recommended' : 'Available',
      badgeColor:
        offset === 1
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : 'bg-gray-100 text-gray-700 border-gray-200',
      displayLabel: `${dayLabel} (${dateFull}) • Afternoon (12:00 PM – 03:00 PM)`,
    });

    // 3. Evening Slot
    slots.push({
      id: `slot-${offset}-evening`,
      dayOffset: offset,
      dayLabel,
      dateShort,
      dateFull,
      timeRange: '04:00 PM – 08:00 PM',
      period: 'Evening',
      badge: 'Available',
      badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
      displayLabel: `${dayLabel} (${dateFull}) • Evening (04:00 PM – 08:00 PM)`,
    });
  });

  return slots;
}

export function CartPage() {
  const navigate = useNavigate();
  const cartItems = useCartItems();

  // Dynamic scheduled delivery slots
  const deliveryDays = useMemo(() => getDynamicDeliveryDays(), []);
  const allSlots = useMemo(() => getDynamicDeliverySlots(), []);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(allSlots[0]?.id || 'slot-1-morning');
  const [activeDayOffset, setActiveDayOffset] = useState<number>(1);
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);
  const slotDropdownRef = useRef<HTMLDivElement>(null);

  const selectedSlot = useMemo(() => {
    return allSlots.find((s) => s.id === selectedSlotId) || allSlots[0];
  }, [allSlots, selectedSlotId]);

  const currentDaySlots = useMemo(() => {
    return allSlots.filter((s) => s.dayOffset === activeDayOffset);
  }, [allSlots, activeDayOffset]);

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Close slot dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (slotDropdownRef.current && !slotDropdownRef.current.contains(e.target as Node)) {
        setIsSlotDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subtotalPaise = cartItems.reduce(
    (acc, item) => acc + item.pricePaise * item.quantity,
    0,
  );
  const deliveryPaise = 0; // Free scheduled delivery
  const totalPaise = subtotalPaise + deliveryPaise;

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      showToast.success(
        'Order Placed Successfully!',
        `Your scheduled slot: ${selectedSlot.displayLabel}. Thank you for shopping on HAAT!`,
      );
      clearCart();
      navigate('/catalogue');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-[#889397]">
          <Link to="/" className="hover:text-[#16135c] transition-colors">
            Home
          </Link>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="font-semibold text-[#16135c]">Shopping Cart</span>
        </div>
      </div>

      {/* 2. Main Page Layout */}
      <div className="mx-auto max-w-container px-4 py-8 md:px-8">
        {/* Header Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-5">
          <div>
            <h1 className="text-2xl font-black text-[#16135c] sm:text-3xl flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-[#16135c] shadow-2xs">
                <ShoppingBag size={22} />
              </span>
              <span>Shopping Cart</span>
            </h1>
            <p className="mt-1 text-xs text-[#5c6c75]">
              Review your selected retail and wholesale items before scheduling delivery.
            </p>
          </div>

          {cartItems.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                clearCart();
                showToast.info('Cart Cleared', 'All items removed from your shopping cart.');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Trash2 size={13} />
              <span>Clear Cart</span>
            </button>
          ) : null}
        </div>

        {cartItems.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-gray-200/80 bg-white p-12 text-center shadow-xs max-w-lg mx-auto mt-6">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-blue-50 text-[#16135c] mb-5 shadow-2xs">
              <ShoppingBag size={38} className="stroke-[1.8]" />
            </div>
            <h2 className="text-xl font-bold text-[#16135c]">Your Cart is Empty</h2>
            <p className="mt-2 text-xs text-[#5c6c75] leading-relaxed max-w-sm mx-auto">
              Looks like you haven&apos;t added any items to your cart yet. Explore thousands of verified groceries, daily essentials, and wholesale supplies.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/catalogue"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white px-6 text-xs font-bold shadow-sm transition-colors"
              >
                <span>Browse Catalogue</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-xs font-bold text-[#21313c] hover:bg-gray-50 transition-colors shadow-2xs"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Cart Grid: Left Items + Right Summary */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items List (Span 8) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xs divide-y divide-gray-100 overflow-hidden">
                <div className="px-5 py-3.5 bg-[#f8f9fa] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#889397]">
                  <span>Items in Cart ({cartItems.length})</span>
                  <span>Quantity & Subtotal</span>
                </div>

                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Item Details */}
                    <div className="flex items-center gap-4 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-16 w-16 shrink-0 rounded-xl border border-gray-200 object-cover bg-white"
                        />
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-gray-200 bg-[#f8f9fa] text-[#16135c]">
                          <ShoppingBag size={24} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#16135c] leading-snug truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs font-semibold text-brand-700 mt-0.5">
                          {money(item.pricePaise)} <span className="text-[10px] text-gray-400 font-normal">/ unit</span>
                        </p>
                        {item.sellerSlug ? (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-[#889397]">
                              Seller: <strong className="text-[#5c6c75]">{item.sellerSlug}</strong>
                            </span>
                            <Link
                              to={`/chat?seller=${item.sellerSlug}&productId=${item.productId}&productTitle=${encodeURIComponent(item.title)}`}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16135c] hover:underline"
                            >
                              <MessageSquare size={11} />
                              <span>Chat Seller</span>
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Quantity Controls & Line Total */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#16135c] transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-[#21313c]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#16135c] transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="text-sm font-bold text-[#16135c]">
                          {money(item.pricePaise * item.quantity)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          removeCartItem(item.productId);
                          showToast.info('Item Removed', item.title);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Shopping Action */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16135c] hover:underline"
                >
                  <ArrowRight size={14} className="rotate-180" />
                  <span>Continue Shopping</span>
                </Link>

                <div className="flex items-center gap-2 text-xs text-[#5c6c75]">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Scheduled slots delivered by verified regional logistics</span>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Dynamic Delivery Slot (Span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#16135c] border-b border-gray-100 pb-3">
                  Order Summary
                </h2>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-[#5c6c75]">
                    <span>Items Subtotal ({cartItems.reduce((a, b) => a + b.quantity, 0)} units)</span>
                    <span className="font-semibold text-[#21313c]">{money(subtotalPaise)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[#5c6c75]">
                    <span>Scheduled Slot Delivery</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      FREE
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#5c6c75]">
                    <span>GST & Taxes</span>
                    <span className="text-[11px] text-gray-400">Included in prices</span>
                  </div>
                </div>

                {/* Dynamic Scheduled Delivery Slot Dropdown */}
                <div
                  ref={slotDropdownRef}
                  className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#16135c]">
                      <Calendar size={14} className="text-[#16135c]" />
                      <span>Choose Delivery Slot</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded-full border border-emerald-200">
                      Guaranteed
                    </span>
                  </div>

                  {/* Dynamic Dropdown Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsSlotDropdownOpen(!isSlotDropdownOpen)}
                    className="w-full text-left rounded-xl border border-blue-200 bg-white p-2.5 hover:border-[#16135c] shadow-2xs transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                    title="Click to update delivery slot"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#16135c] shrink-0 mt-0.5 group-hover:bg-[#16135c] group-hover:text-white transition-colors">
                        <Clock size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#16135c]">
                            {selectedSlot.dayLabel} ({selectedSlot.dateShort})
                          </span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${selectedSlot.badgeColor}`}>
                            {selectedSlot.badge}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-[#5c6c75] truncate mt-0.5">
                          {selectedSlot.timeRange} • {selectedSlot.period}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#16135c] shrink-0">
                      <span className="text-[11px] underline sm:no-underline">
                        {isSlotDropdownOpen ? 'Close' : 'Update'}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isSlotDropdownOpen ? 'rotate-180 text-[#16135c]' : 'text-gray-400'}`}
                      />
                    </div>
                  </button>

                  {/* Dynamic Schedule Update Panel */}
                  {isSlotDropdownOpen ? (
                    <div className="rounded-xl border border-blue-200 bg-white p-3 space-y-3 shadow-lg animate-in fade-in-50 duration-150">
                      {/* Day Selector Tabs */}
                      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100/90 rounded-lg">
                        {deliveryDays.map((day) => {
                          const isActive = activeDayOffset === day.offset;
                          return (
                            <button
                              key={day.offset}
                              type="button"
                              onClick={() => setActiveDayOffset(day.offset)}
                              className={`rounded-md py-1.5 px-1 text-center transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-[#16135c] text-white font-bold shadow-2xs'
                                  : 'text-[#5c6c75] hover:text-[#16135c] font-medium'
                              }`}
                            >
                              <span className="block text-[11px] leading-tight truncate">{day.dayLabel}</span>
                              <span className={`block text-[10px] ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                                {day.dateShort}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Slot Options for Active Day */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto buyer-scrollbar">
                        {currentDaySlots.map((slot) => {
                          const isSelected = selectedSlotId === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                setSelectedSlotId(slot.id);
                                showToast.info('Delivery Slot Updated', slot.displayLabel);
                              }}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'border-[#16135c] bg-blue-50/70 shadow-2xs'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`grid h-5 w-5 place-items-center rounded-full border text-xs shrink-0 ${
                                    isSelected
                                      ? 'border-[#16135c] bg-[#16135c] text-white'
                                      : 'border-gray-300 text-transparent'
                                  }`}
                                >
                                  <Check size={11} strokeWidth={3} />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-[#16135c]">
                                    {slot.timeRange}
                                  </div>
                                  <div className="text-[10px] text-[#5c6c75]">
                                    {slot.period} Window
                                  </div>
                                </div>
                              </div>

                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border shrink-0 ${slot.badgeColor}`}>
                                {slot.badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Confirm & Close Schedule Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSlotDropdownOpen(false);
                          showToast.success('Schedule Slot Updated', selectedSlot.displayLabel);
                        }}
                        className="w-full inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#16135c] hover:bg-[#12104b] text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                      >
                        <CheckCircle2 size={13} />
                        <span>Confirm Schedule Slot</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Total Line */}
                <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#16135c]">Total Payable</span>
                  <span className="text-xl font-black text-[#16135c]">{money(totalPaise)}</span>
                </div>

                {/* Checkout CTA */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  <span>{isCheckingOut ? 'Processing Order...' : 'Proceed to Checkout'}</span>
                </button>

                <p className="text-[10px] text-center text-[#889397]">
                  By placing your order, you agree to HAAT&apos;s Terms of Service and Scheduled Delivery policies.
                </p>
              </div>

              {/* Guarantees Box */}
              <div className="rounded-2xl border border-gray-100 bg-[#f8f9fa] p-4 text-xs space-y-2 text-[#5c6c75]">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>100% Genuine products from verified sellers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#16135c] shrink-0" />
                  <span>Guaranteed delivery in your chosen slot</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
