import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import {
  useCartItems,
  clearCart,
} from '../features/chat/chatStore';
import { useAuth } from '../features/auth/AuthProvider';
import { DeliverySlotPicker } from '../features/delivery/DeliverySlotPicker';
import { initiateRazorpayPayment } from '../features/payments/useRazorpay';
import { api, money, showToast } from '@haat/shared-frontend';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cartItems = useCartItems();

  const [address, setAddress] = useState({
    name: user?.fullName || '',
    phone: user?.phoneNumber || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [selectedSlot, setSelectedSlot] = useState<{
    slotId: string | null;
    date: string | null;
    label: string | null;
  }>({
    slotId: '000000000000000000000001',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    label: 'Standard Morning (9 AM – 12 PM)',
  });

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotalPaise = cartItems.reduce((acc, it) => acc + (it.pricePaise || 0) * (it.quantity || 1), 0);
  const deliveryFeePaise = subtotalPaise > 50000 ? 0 : 4900; // Free delivery over ₹500
  const totalAmountPaise = subtotalPaise + deliveryFeePaise;

  const firstSellerId = '660000000000000000000001';

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast.info('Sign In Required', 'Please sign in to place your order.');
      navigate('/login?redirect=/checkout');
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

    if (!selectedSlot.slotId || !selectedSlot.date) {
      showToast.error('Delivery Slot Required', 'Please select a scheduled delivery date and time slot.');
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
        deliverySlotId: selectedSlot.slotId,
        deliveryDate: selectedSlot.date,
        shippingAddress: address,
        idempotencyKey,
        paymentMethod,
      };

      const res = await api.post<{ order: any }>('/checkout/initiate', payload);
      const order = res.data.order;

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-[#0AAD0A] mb-4">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="mt-1 text-sm text-gray-500 max-w-sm">
          Add items to your cart from our verified local merchants to proceed with checkout.
        </p>
        <Link
          to="/catalogue"
          className="mt-6 rounded-xl bg-[#0AAD0A] px-6 py-3 text-sm font-bold text-white hover:bg-[#099b09] transition-all shadow-md"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto flex max-w-container items-center gap-2 px-4 md:px-8 text-xs text-gray-400">
          <Link to="/" className="hover:text-[#16135c]">Home</Link>
          <ChevronRight size={12} />
          <Link to="/cart" className="hover:text-[#16135c]">Cart</Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-gray-900">Checkout & Fulfilment</span>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 md:px-8 pt-6">
        <h1 className="text-2xl font-bold text-gray-900">Scheduled Fulfilment & Checkout</h1>
        <p className="text-xs text-gray-500 mt-1">
          Review shipping address, select your preferred delivery window, and complete payment.
        </p>

        <form onSubmit={handlePlaceOrder} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Details (Span 7) */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Shipping Address Section */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                <MapPin className="h-4 w-4 text-[#0AAD0A]" />
                <span>1. Delivery Destination Address</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none focus:ring-1 focus:ring-[#0AAD0A]"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none focus:ring-1 focus:ring-[#0AAD0A]"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Address Line 1 (Flat, Building, Street) *</label>
                  <input
                    type="text"
                    required
                    value={address.addressLine1}
                    onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none focus:ring-1 focus:ring-[#0AAD0A]"
                    placeholder="e.g. Flat 402, Green Valley Apartments, MG Road"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">City *</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none focus:ring-1 focus:ring-[#0AAD0A]"
                    placeholder="e.g. Mumbai"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">State *</label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none focus:ring-1 focus:ring-[#0AAD0A]"
                    placeholder="e.g. Maharashtra"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">6-Digit Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0AAD0A] focus:outline-none focus:ring-1 focus:ring-[#0AAD0A]"
                    placeholder="400001"
                  />
                </div>
              </div>
            </div>

            {/* 2. Scheduled Delivery Window */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                <Clock className="h-4 w-4 text-[#0AAD0A]" />
                <span>2. Scheduled Delivery Window</span>
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
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                <CreditCard className="h-4 w-4 text-[#0AAD0A]" />
                <span>3. Payment Method</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-[#0AAD0A] bg-[#0AAD0A]/10 ring-1 ring-[#0AAD0A]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'ONLINE'}
                      onChange={() => setPaymentMethod('ONLINE')}
                      className="accent-[#0AAD0A]"
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-900">Online Payment</div>
                      <div className="text-xs text-gray-500">UPI, Credit/Debit Cards, NetBanking</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#0AAD0A]">Razorpay</span>
                </label>

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-[#0AAD0A] bg-[#0AAD0A]/10 ring-1 ring-[#0AAD0A]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-[#0AAD0A]"
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-900">Cash on Delivery</div>
                      <div className="text-xs text-gray-500">Pay when goods are delivered</div>
                    </div>
                  </div>
                  <Truck className="h-4 w-4 text-gray-400" />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Span 5) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                Order Summary ({cartItems.length} items)
              </h3>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-10 w-10 shrink-0 rounded-lg object-cover border" />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500">
                          <ShoppingBag size={14} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-gray-400 text-[10px]">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 shrink-0">
                      {money(item.pricePaise * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">{money(subtotalPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-gray-900">
                    {deliveryFeePaise === 0 ? <span className="text-[#0AAD0A]">FREE</span> : money(deliveryFeePaise)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-100 pt-2">
                  <span>Total Payable</span>
                  <span className="text-[#0AAD0A]">{money(totalAmountPaise)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0AAD0A] hover:bg-[#099b09] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Placing Order...' : `Confirm & Place Order · ${money(totalAmountPaise)}`}</span>
              </button>

              <div className="rounded-xl bg-gray-50 p-3 text-micro text-gray-500 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0AAD0A]" />
                  <span>HAAT Safe Fulfilment Guarantee</span>
                </div>
                <p>Slot-locked capacity with direct local merchant accountability.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
