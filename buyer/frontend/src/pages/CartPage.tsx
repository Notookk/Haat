import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';
import {
  useCartItems,
  updateCartQuantity,
  removeCartItem,
  clearCart,
} from '../features/chat/chatStore';
import { money, showToast } from '@haat/shared-frontend';
import { useAuth } from '../features/auth/AuthProvider';

const MIN_ORDER_PAISE = 9900; // ₹99
const FREE_DELIVERY_THRESHOLD_PAISE = 19900; // ₹199
const STANDARD_DELIVERY_FEE_PAISE = 4900; // ₹49

export function CartPage() {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const cartItems = useCartItems();

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const subtotalPaise = cartItems.reduce(
    (acc, item) => acc + item.pricePaise * item.quantity,
    0,
  );
  const isFreeDelivery = subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE;
  const deliveryPaise = isFreeDelivery ? 0 : STANDARD_DELIVERY_FEE_PAISE;
  const totalPaise = subtotalPaise + deliveryPaise;
  const isMinOrderMet = subtotalPaise >= MIN_ORDER_PAISE;
  const minOrderShortfall = MIN_ORDER_PAISE - subtotalPaise;
  const freeDeliveryShortfall = FREE_DELIVERY_THRESHOLD_PAISE - subtotalPaise;
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    if (!isAuthenticated || !user) {
      showToast.info('Sign In Required', 'Please sign in to your account to proceed to checkout and place an order.');
      navigate('/login?redirect=/checkout');
      return;
    }
    if (!isMinOrderMet) {
      showToast.error('Minimum Order ₹99', `Please add items worth at least ${money(minOrderShortfall)} more.`);
      return;
    }
    setIsCheckingOut(true);
    navigate('/checkout');
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
            <div className="mt-6">
              <Link
                to="/catalogue"
                className="inline-flex items-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white px-6 py-3 text-xs font-bold shadow-md transition-all"
              >
                <span>Explore Products</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* 3. Non-Empty Cart: Items List + Order Summary */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* Left Column: Items List (Span 8) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#5c6c75] px-1">
                <span className="font-semibold uppercase tracking-wider">
                  Items in Cart ({cartItems.length})
                </span>
                <span className="font-semibold uppercase tracking-wider">
                  Quantity & Subtotal
                </span>
              </div>

              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs hover:border-gray-300 transition-all"
                  >
                    {/* Item Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-16 w-16 rounded-xl object-cover border border-gray-100 shrink-0 bg-gray-50"
                        />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-xl bg-blue-50 text-[#16135c] shrink-0 font-bold text-base">
                          {item.title.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/products/${item.productId}`}
                          className="text-sm font-bold text-[#16135c] hover:underline line-clamp-1"
                        >
                          {item.title}
                        </Link>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-semibold text-[#21313c]">
                            {money(item.pricePaise)}
                            <span className="text-[10px] text-gray-500 font-normal"> / unit</span>
                          </span>

                          {item.isCustomQuote ? (
                            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              Custom Quote
                            </span>
                          ) : item.isWholesale ? (
                            <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              Wholesale Tier
                            </span>
                          ) : null}
                        </div>

                        {item.sellerSlug && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#5c6c75]">
                            <span>Seller: <strong className="text-gray-700 font-medium">{item.sellerSlug}</strong></span>
                            <span>•</span>
                            <Link
                              to={`/chat?sellerId=${encodeURIComponent(item.sellerSlug)}`}
                              className="inline-flex items-center gap-1 text-[#16135c] hover:underline font-medium text-[10px]"
                            >
                              <MessageSquare size={10} />
                              <span>Chat Seller</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper & Line Total */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/60 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateCartQuantity(item.productId, item.quantity - 1);
                            } else {
                              removeCartItem(item.productId);
                            }
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200/80 shadow-2xs transition-colors cursor-pointer"
                          title={item.quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                        >
                          <Minus size={12} />
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              updateCartQuantity(item.productId, val);
                            }
                          }}
                          className="w-10 text-center text-xs font-bold text-[#16135c] bg-transparent focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-white text-gray-600 hover:text-[#16135c] hover:bg-blue-50 border border-gray-200/80 shadow-2xs transition-colors cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right min-w-[70px]">
                        <span className="text-sm font-bold text-[#16135c]">
                          {money(item.pricePaise * item.quantity)}
                        </span>
                      </div>

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => {
                          removeCartItem(item.productId);
                          showToast.info('Item Removed', `${item.title} removed from cart.`);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                        title="Delete item"
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

            {/* Right Column: Order Summary (Span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#16135c]">
                    Order Summary
                  </h2>
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
                  </span>
                </div>

                {/* Free Delivery Progress Banner */}
                {isFreeDelivery ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center gap-2.5 text-xs text-emerald-900">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <span className="font-bold">FREE Delivery Applied!</span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Orders above ₹199 qualify for 100% free delivery.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-[#16135c] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Truck size={14} className="text-[#16135c]" />
                        <span>Add {money(freeDeliveryShortfall)} for FREE Delivery</span>
                      </span>
                      <span className="text-[10px] text-[#5c6c75]">
                        {Math.min(100, Math.round((subtotalPaise / FREE_DELIVERY_THRESHOLD_PAISE) * 100))}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#16135c] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((subtotalPaise / FREE_DELIVERY_THRESHOLD_PAISE) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#5c6c75]">
                      Free delivery on orders above ₹199. Standard fee ₹49 applies below ₹199.
                    </p>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-[#5c6c75]">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-[#21313c]">{money(subtotalPaise)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[#5c6c75]">
                    <span>Scheduled Delivery Fee</span>
                    <span className="font-semibold">
                      {isFreeDelivery ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-gray-400 line-through text-[11px]">₹49</span>
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                            FREE
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#21313c] font-semibold">{money(STANDARD_DELIVERY_FEE_PAISE)}</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#5c6c75]">
                    <span>GST & Taxes</span>
                    <span className="text-[11px] text-gray-400">Included in prices</span>
                  </div>
                </div>

                {/* Minimum Order Warning (if subtotal < 99) */}
                {!isMinOrderMet && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Minimum Order: ₹99</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Your subtotal is {money(subtotalPaise)}. Please add {money(minOrderShortfall)} more to proceed to checkout.
                      </p>
                    </div>
                  </div>
                )}

                {/* Total Line */}
                <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#16135c]">Total Payable</span>
                  <span className="text-xl font-black text-[#16135c]">{money(totalPaise)}</span>
                </div>

                {/* Checkout CTA */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isCheckingOut || cartItems.length === 0 || !isMinOrderMet}
                  className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {!isMinOrderMet
                      ? `Minimum Order ₹99 Required (Add ${money(minOrderShortfall)})`
                      : isCheckingOut
                        ? 'Processing Order...'
                        : !isAuthenticated
                          ? 'Sign In to Proceed to Checkout'
                          : 'Proceed to Checkout'}
                  </span>
                </button>

                {!isAuthenticated && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 flex items-center gap-2">
                    <span className="font-semibold">Sign in required:</span>
                    <span>You must be signed in to complete checkout and place an order.</span>
                  </div>
                )}

                <p className="text-[10px] text-center text-[#889397]">
                  Delivery slot and shipping address will be confirmed on the checkout page.
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
                  <span>Scheduled delivery window selected at checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
