import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowLeft,
  Store,
} from 'lucide-react';
import {
  useCartItems,
  clearCart,
  addRedeemedQuoteIds,
} from '../features/chat/chatStore';
import { useAuth } from '../features/auth/AuthProvider';
import { DeliverySlotPicker } from '../features/delivery/DeliverySlotPicker';
import { initiateRazorpayPayment } from '../features/payments/useRazorpay';
import { api, money, showToast } from '@haat/shared-frontend';

const MIN_ORDER_PAISE = 9900; // ₹99
const FREE_DELIVERY_THRESHOLD_PAISE = 19900; // ₹199
const STANDARD_DELIVERY_FEE_PAISE = 4900; // ₹49

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const cartItems = useCartItems();

  // Redirect immediately if not signed in — unauthenticated users cannot place orders
  useEffect(() => {
    if (status !== 'booting' && !isAuthenticated) {
      showToast.info('Sign In Required', 'Please sign in to your account to place an order.');
      navigate('/login?redirect=/checkout', { replace: true });
    }
  }, [status, isAuthenticated, navigate]);

  const [address, setAddress] = useState({
    name: user?.fullName || '',
    phone: user?.phoneNumber || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Fetch saved delivery addresses
  const { data: addressesData } = useQuery<{ addresses: any[] }>({
    queryKey: ['buyer-addresses'],
    queryFn: async () => {
      const res = await api.get<{ addresses: any[] }>('/addresses');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const savedAddresses = addressesData?.addresses || [];

  // Auto-populate default address when available
  useEffect(() => {
    if (savedAddresses.length > 0 && !address.addressLine1) {
      const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      if (def) {
        setAddress({
          name: def.recipientName || user?.fullName || '',
          phone: def.phoneNumber || user?.phoneNumber || '',
          addressLine1: def.line1 || '',
          addressLine2: def.line2 || '',
          city: def.city || '',
          state: def.state || '',
          pincode: def.pincode || '',
        });
      }
    }
  }, [savedAddresses, user]);

  const [selectedSlot, setSelectedSlot] = useState<{
    slotId: string | null;
    date: string | null;
    label: string | null;
  }>({
    slotId: null,
    date: null,
    label: null,
  });

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exact Calculation logic
  const subtotalPaise = cartItems.reduce(
    (acc, it) => acc + (it.pricePaise || 0) * (it.quantity || 1),
    0,
  );
  const isFreeDelivery = subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE;
  const deliveryFeePaise = isFreeDelivery ? 0 : STANDARD_DELIVERY_FEE_PAISE;
  const totalAmountPaise = subtotalPaise + deliveryFeePaise;
  const isMinOrderMet = subtotalPaise >= MIN_ORDER_PAISE;
  const minOrderShortfall = MIN_ORDER_PAISE - subtotalPaise;
  const freeDeliveryShortfall = FREE_DELIVERY_THRESHOLD_PAISE - subtotalPaise;
  const totalUnits = cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const isSlotSelected = Boolean(selectedSlot.slotId && selectedSlot.date);

  const firstSellerId = cartItems[0]?.sellerSlug || '';

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast.info('Sign In Required', 'Please sign in to place your order.');
      navigate('/login?redirect=/checkout');
      return;
    }

    if (!isMinOrderMet) {
      showToast.error(
        'Minimum Order ₹99 Required',
        `Your order subtotal must be at least ₹99. Please add ${money(minOrderShortfall)} more items.`,
      );
      return;
    }

    if (!address.name.trim() || !address.phone.trim() || !address.addressLine1.trim()) {
      showToast.error('Incomplete Address', 'Please provide recipient name, phone, and street address.');
      return;
    }

    if (!address.pincode.match(/^\d{6}$/)) {
      showToast.error('Invalid Pincode', 'Please enter a valid 6-digit Indian pincode.');
      return;
    }

    if (!isSlotSelected) {
      showToast.error('Delivery Slot Required', 'Please select a delivery date and time slot.');
      return;
    }

    setIsSubmitting(true);

    try {
      const idempotencyKey = crypto.randomUUID();

      const payload = {
        items: cartItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        deliverySlotId:
          selectedSlot.slotId && selectedSlot.slotId !== 'express-shortly'
            ? selectedSlot.slotId
            : undefined,
        deliveryDate: selectedSlot.date,
        shippingAddress: address,
        idempotencyKey,
        paymentMethod,
      };

      const res = await api.post<{ order: any }>('/checkout/initiate', payload);
      const order = res.data.order;

      // Mark any custom quotes in cart as redeemed / ordered
      const quoteMessageIds = cartItems
        .map((it) => it.quoteMessageId)
        .filter(Boolean) as string[];

      if (quoteMessageIds.length > 0) {
        addRedeemedQuoteIds(quoteMessageIds);
        try {
          await api.post('/chat/quote/order', { messageIds: quoteMessageIds });
        } catch {
          // Non-blocking
        }
      }

      clearCart();

      if (paymentMethod === 'ONLINE') {
        showToast.success('Order Created', 'Opening payment gateway...');
        await initiateRazorpayPayment({
          orderId: order._id,
          amountPaise: order.totalAmountPaise,
          buyerName: address.name,
          buyerPhone: address.phone,
          onSuccess: (confirmedOrder) => {
            navigate(`/orders/${confirmedOrder._id}`);
          },
          onError: () => {
            navigate(`/orders/${order._id}`);
          },
        });
      } else {
        showToast.success('Order Placed!', `Your order #${order.orderNumber} is confirmed.`);
        navigate(`/orders/${order._id}`);
      }
    } catch (err: any) {
      const msg = err.details?.[0]?.message || err.message || 'Unable to place order. Please try again.';
      showToast.error('Checkout Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-[#16135c] mb-4 shadow-2xs">
          <ShoppingBag className="h-10 w-10 stroke-[1.8]" />
        </div>
        <h2 className="text-xl font-bold text-[#16135c]">Your Cart is Empty</h2>
        <p className="mt-1 text-xs text-[#5c6c75] max-w-sm">
          Add items to your cart from our verified local merchants to proceed with checkout.
        </p>
        <Link
          to="/catalogue"
          className="mt-6 rounded-xl bg-[#16135c] hover:bg-[#12104b] px-6 py-3 text-xs font-bold text-white transition-all shadow-md"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-20">
      {/* Breadcrumb Bar */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-[#889397]">
          <Link to="/" className="hover:text-[#16135c] transition-colors">
            Home
          </Link>
          <ChevronRight size={12} className="text-gray-300" />
          <Link to="/cart" className="hover:text-[#16135c] transition-colors">
            Cart
          </Link>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="font-semibold text-[#16135c]">Checkout & Fulfilment</span>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 md:px-8 pt-8">
        {/* Header & Stepper */}
        <div className="border-b border-gray-200/80 pb-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16135c] hover:underline mr-2"
                >
                  <ArrowLeft size={13} />
                  <span>Return to Cart</span>
                </Link>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-[#16135c]">
                  HAAT Guaranteed Delivery
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#16135c] sm:text-3xl mt-2">
                Scheduled Fulfilment & Checkout
              </h1>
              <p className="text-xs text-[#5c6c75] mt-1">
                Fast, reliable delivery directly from verified local merchants.
              </p>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 sm:gap-3 bg-white border border-gray-200/80 rounded-2xl px-4 py-2.5 shadow-2xs self-start md:self-auto">
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-[#16135c] text-white text-[11px] font-bold">
                  1
                </div>
                <span className="text-xs font-bold text-[#16135c]">Address</span>
              </div>
              <ChevronRight size={14} className="text-gray-300" />
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-[#16135c] text-white text-[11px] font-bold">
                  2
                </div>
                <span className="text-xs font-bold text-[#16135c]">Slot</span>
              </div>
              <ChevronRight size={14} className="text-gray-300" />
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-[#16135c] text-white text-[11px] font-bold">
                  3
                </div>
                <span className="text-xs font-bold text-[#16135c]">Payment</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Checkout Stages (Span 7) */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Shipping Address Section */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#16135c] text-white text-xs font-bold shadow-2xs">
                    1
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Delivery Destination Address</h2>
                    <p className="text-[11px] text-[#5c6c75]">Where should the seller deliver your order?</p>
                  </div>
                </div>
                {savedAddresses.length > 0 ? (
                  <Link to="/addresses" className="text-xs font-bold text-[#16135c] hover:underline">
                    Manage Addresses →
                  </Link>
                ) : null}
              </div>

              {/* Saved Address Quick Selector */}
              {savedAddresses.length > 0 ? (
                <div className="rounded-2xl bg-blue-50/50 border border-blue-150 p-3.5 space-y-2">
                  <div className="text-xs font-bold text-[#16135c]">Choose from Saved Addresses:</div>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((sa) => {
                      const isSelected =
                        address.addressLine1 === sa.line1 && address.pincode === sa.pincode;
                      return (
                        <button
                          key={sa._id}
                          type="button"
                          onClick={() =>
                            setAddress({
                              name: sa.recipientName,
                              phone: sa.phoneNumber,
                              addressLine1: sa.line1,
                              addressLine2: sa.line2 || '',
                              city: sa.city,
                              state: sa.state,
                              pincode: sa.pincode,
                            })
                          }
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#16135c] bg-[#16135c] text-white font-bold shadow-2xs'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <MapPin size={12} className={isSelected ? 'text-blue-200' : 'text-gray-400'} />
                          <span className="capitalize">{sa.label || 'Saved'}:</span>
                          <span className="truncate max-w-[140px]">{sa.line1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Address Input Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-gray-700">Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. Gourab Majumdar"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700">
                    Street Address (Flat, House No, Building, Street) *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.addressLine1}
                    onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. Flat 402, Green Valley Apartments, MG Road"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700">
                    Landmark / Area (Optional)
                  </label>
                  <input
                    type="text"
                    value={address.addressLine2}
                    onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. Near City Hospital or Metro Gate 2"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">City / District *</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. Kolkata / Mumbai"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">State *</label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. West Bengal"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">6-Digit Indian Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200/90 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16135c] focus:outline-none focus:ring-2 focus:ring-[#16135c]/10 transition-all placeholder:text-gray-400"
                    placeholder="e.g. 741245"
                  />
                </div>
              </div>
            </div>

            {/* 2. Scheduled Delivery Window */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#16135c] text-white text-xs font-bold shadow-2xs">
                    2
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Scheduled Delivery Window</h2>
                    <p className="text-[11px] text-[#5c6c75]">
                      Choose your preferred delivery date and time slot with the seller.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Seller Fulfilled
                </span>
              </div>

              <DeliverySlotPicker
                sellerId={firstSellerId}
                selectedSlotId={selectedSlot.slotId}
                selectedDate={selectedSlot.date}
                onSelectSlot={(slotId, date, label) =>
                  setSelectedSlot({ slotId, date, label })
                }
              />
            </div>

            {/* 3. Payment Method */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#16135c] text-white text-xs font-bold shadow-2xs">
                    3
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#16135c]">Payment Method</h2>
                    <p className="text-[11px] text-[#5c6c75]">Choose how you would like to pay for your order.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                  <Lock size={12} className="text-emerald-600" />
                  <span>256-Bit Encrypted</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-[#16135c] bg-blue-50/60 ring-2 ring-[#16135c] shadow-2xs'
                      : 'border-gray-200 bg-white hover:border-[#16135c]/50 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'ONLINE'}
                      onChange={() => setPaymentMethod('ONLINE')}
                      className="accent-[#16135c] h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#16135c]">Online Payment</div>
                      <div className="text-[11px] text-gray-500">UPI, Cards, NetBanking via Razorpay</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Recommended
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-[#16135c] bg-blue-50/60 ring-2 ring-[#16135c] shadow-2xs'
                      : 'border-gray-200 bg-white hover:border-[#16135c]/50 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-[#16135c] h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#16135c]">Cash on Delivery (COD)</div>
                      <div className="text-[11px] text-gray-500">Pay cash or UPI upon delivery</div>
                    </div>
                  </div>
                  <Truck className="h-4 w-4 text-[#16135c] shrink-0" />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Span 5 - Sticky) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-5 sticky top-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#16135c]">
                  Order Summary
                </h3>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} ({totalUnits} units)
                </span>
              </div>

              {/* Explicit Calculation Breakdown Callout (User Requirement) */}
              <div className="space-y-3">
                {isFreeDelivery ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-emerald-900">FREE Delivery Unlocked!</div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Orders above ₹199 qualify for 100% Free Delivery. You saved ₹49 on this order!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-[#16135c] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Truck size={14} className="text-[#16135c]" />
                        <span>Add {money(freeDeliveryShortfall)} for FREE Delivery</span>
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {Math.min(100, Math.round((subtotalPaise / FREE_DELIVERY_THRESHOLD_PAISE) * 100))}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#16135c] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((subtotalPaise / FREE_DELIVERY_THRESHOLD_PAISE) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#5c6c75] pt-0.5">
                      <span>• Orders above ₹199: FREE Delivery</span>
                      <span>• Orders below ₹199: ₹49 fee</span>
                    </div>
                  </div>
                )}

                {/* Minimum Order Check Warning */}
                {!isMinOrderMet && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Minimum Order Value: ₹99</div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Your current subtotal is {money(subtotalPaise)}. Please add items worth at least{' '}
                        <strong>{money(minOrderShortfall)}</strong> more to place your order.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 pr-1 buyer-scrollbar">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover border border-gray-100 bg-gray-50"
                        />
                      ) : (
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#16135c] font-bold">
                          <ShoppingBag size={15} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-[#16135c] truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                          <span>Qty: <strong className="text-gray-700">{item.quantity}</strong></span>
                          <span>•</span>
                          <span>{money(item.pricePaise)} / unit</span>
                        </div>
                        {item.isCustomQuote && (
                          <span className="inline-block mt-0.5 rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700">
                            Custom Quote
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-[#16135c] shrink-0">
                      {money(item.pricePaise * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Calculation Breakdown Table */}
              <div className="space-y-2.5 border-t border-gray-100 pt-4 text-xs">
                <div className="flex items-center justify-between text-[#5c6c75]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-gray-900">{money(subtotalPaise)}</span>
                </div>

                <div className="flex items-center justify-between text-[#5c6c75]">
                  <span>Scheduled Delivery Fee</span>
                  <span className="font-semibold">
                    {isFreeDelivery ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-gray-400 line-through text-[11px]">₹49</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          FREE
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-900 font-semibold">{money(STANDARD_DELIVERY_FEE_PAISE)}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#5c6c75]">
                  <span>GST & Taxes</span>
                  <span className="text-[11px] text-gray-400">Included in prices</span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-bold text-[#16135c]">Total Payable</span>
                    <p className="text-[10px] text-[#5c6c75]">Minimum order ₹99 • Free delivery above ₹199</p>
                  </div>
                  <span className="text-xl font-black text-[#16135c]">{money(totalAmountPaise)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !isAuthenticated || !isMinOrderMet || !isSlotSelected}
                className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isSubmitting
                    ? 'Placing Order...'
                    : !isAuthenticated
                      ? 'Sign In Required to Place Order'
                      : !isMinOrderMet
                        ? `Minimum Order ₹99 Required (Add ${money(minOrderShortfall)})`
                        : !isSlotSelected
                          ? 'Select a Delivery Slot to Place Order'
                          : `Confirm & Place Order · ${money(totalAmountPaise)}`}
                </span>
              </button>

              {/* HAAT Safe Fulfilment Guarantee */}
              <div className="rounded-2xl border border-gray-100 bg-[#f8f9fa] p-4 text-xs space-y-2 text-[#5c6c75]">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-800">HAAT Safe Fulfilment Guarantee</span>
                </div>
                <p className="text-[11px] text-[#5c6c75] leading-relaxed">
                  Slot-locked capacity with direct local merchant accountability. 100% genuine products guaranteed.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
