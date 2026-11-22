import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, Plus, Eye, Heart, ArrowLeftRight, X, Minus, Check, MessageCircle, Trash2 } from 'lucide-react';
import { api, money, ProductMedia, showToast, type Product } from '@haat/shared-frontend';
import { useAuth } from '../features/auth/AuthProvider';
import {
  addProductToCart,
  removeCartItem,
  toggleWishlistProduct,
  isProductWishlisted,
  isProductInCart,
} from '../features/chat/chatStore';

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const canChat = isAuthenticated;
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quantity, setQuantity] = useState(product.moq || 1);
  const [isWishlisted, setIsWishlisted] = useState(() => isProductWishlisted(product.id));
  const [isInCart, setIsInCart] = useState(() => isProductInCart(product.id));
  const [isCompared, setIsCompared] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWishlistChange = () => {
      setIsWishlisted(isProductWishlisted(product.id));
    };
    const handleCartChange = () => {
      setIsInCart(isProductInCart(product.id));
    };
    window.addEventListener('haat_wishlist_updated', handleWishlistChange);
    window.addEventListener('haat_cart_updated', handleCartChange);
    window.addEventListener('storage', handleCartChange);
    return () => {
      window.removeEventListener('haat_wishlist_updated', handleWishlistChange);
      window.removeEventListener('haat_cart_updated', handleCartChange);
      window.removeEventListener('storage', handleCartChange);
    };
  }, [product.id]);

  const primary = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  const categoryName = product.categoryPath.split('/').slice(-1)[0]?.replace(/-/g, ' ') ?? 'General';

  // Compute lowest tier price for wholesale / discount
  const cheapestTier = product.pricingTiers?.reduce<(typeof product.pricingTiers)[number] | null>(
    (lowest, tier) => (lowest === null || tier.unitPricePaise < lowest.unitPricePaise ? tier : lowest),
    null,
  ) ?? null;

  const hasTierDiscount = cheapestTier !== null && cheapestTier.unitPricePaise < product.retailPricePaise;
  const displayPricePaise = hasTierDiscount ? cheapestTier.unitPricePaise : product.retailPricePaise;

  const originalPricePaise =
    product.totalPricePaise && product.totalPricePaise > displayPricePaise
      ? product.totalPricePaise
      : product.discountPercent && product.discountPercent > 0
        ? Math.round(product.retailPricePaise / (1 - product.discountPercent / 100))
        : hasTierDiscount
          ? product.retailPricePaise
          : null;

  const discountPercent =
    product.discountPercent ||
    (originalPricePaise && originalPricePaise > displayPricePaise
      ? Math.round(((originalPricePaise - displayPricePaise) / originalPricePaise) * 100)
      : 0);

  // Rating data (defaults to 4.5 and 25 reviews if mock or empty)
  const ratingScore = product.ratingAverage || 4.5;
  const reviewCount = product.ratingCount || 25;

  // Top Left Badge: Sale (Red) or Discount % (Brand Navy Blue)
  const leftBadge =
    discountPercent > 0
      ? { text: `${discountPercent}%`, bg: 'bg-[#16135c] text-white' }
      : { text: 'Sale', bg: 'bg-red-600 text-white' };

  // Top Right Badge: Product Availability
  const isSoldOut = product.stockState === 'SOLD_OUT' || (product.totalStock !== undefined && product.totalStock <= 0);
  const isLowStock =
    product.stockState === 'LOW_STOCK' ||
    (product.totalStock !== undefined && product.totalStock > 0 && product.totalStock <= 10);

  const stockBadge = isSoldOut
    ? { text: 'No Stock', bg: 'bg-red-600 text-white' }
    : isLowStock
      ? {
          text: product.totalStock && product.totalStock <= 5 ? `Only ${product.totalStock} left` : 'Low Stock',
          bg: 'bg-orange-500 text-white',
        }
      : { text: 'In Stock', bg: 'bg-emerald-600 text-white' };

  // Handle Quick View Escape key and body lock
  useEffect(() => {
    if (!quickViewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickViewOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [quickViewOpen]);

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = toggleWishlistProduct(product.id);
    setIsWishlisted(nextState);
    showToast.success(nextState ? `Added to wishlist` : `Removed from wishlist`, product.title);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCompared(!isCompared);
    showToast.info(isCompared ? `Removed from comparison` : `Added to compare list`, product.title);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;
    if (isInCart) {
      removeCartItem(product.id);
      setIsInCart(false);
      showToast.info('Removed from cart', product.title);
      return;
    }
    addProductToCart({
      productId: product.id,
      title: product.title,
      pricePaise: displayPricePaise,
      quantity: 1,
      image: primary?.url,
      sellerSlug: product.sellerSlug,
    });
    setIsInCart(true);
    showToast.success('Added to cart', product.title);
  };

  const handleOpenChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast.info('Sign In Required', 'Please sign in to chat with sellers.');
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    const params = new URLSearchParams();
    if (product.sellerSlug) params.set('seller', product.sellerSlug);
    if (product.sellerName) params.set('sellerName', product.sellerName);
    if (product.id) params.set('productId', product.id);
    if (product.title) params.set('productTitle', product.title);
    if (product.sku) params.set('sku', product.sku);
    if (primary?.url) params.set('productImage', primary.url);
    if (displayPricePaise) params.set('price', String(displayPricePaise));
    navigate(`/chat?${params.toString()}`);
  };

  return (
    <>
      {/* Product Card Container matching hover and non-hover states */}
      <div className="group relative flex flex-col justify-between rounded-xl border border-[#dfe2e1] bg-white p-3.5 sm:p-4 transition-all duration-200 hover:border-[#16135c] hover:shadow-[0_5px_12px_rgba(0,0,0,0.12)]">
        <Link to={`/product/${product.slug}`} className="block">
          {/* Product Media Area with Badges & Hover Actions */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#f8f9fa] flex items-center justify-center">
            <ProductMedia image={primary} alt={product.title} sku={product.sku} />

            {/* Top Left Corner: Sale / Discount Badge */}
            <div className="absolute top-2.5 left-2.5 z-10">
              <span
                className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold leading-none shadow-2xs ${leftBadge.bg}`}
              >
                {leftBadge.text}
              </span>
            </div>

            {/* Top Right Corner: Product Availability Badge */}
            <div className="absolute top-2.5 right-2.5 z-10">
              <span
                className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold leading-none shadow-2xs ${stockBadge.bg}`}
              >
                {stockBadge.text}
              </span>
            </div>

            {/* Floating Action Buttons Overlay (Appears smoothly on hover) */}
            <div className="absolute bottom-2.5 left-0 right-0 z-20 flex items-center justify-center gap-2 opacity-0 invisible pointer-events-none translate-y-1.5 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-200 ease-out">
              <button
                type="button"
                onClick={handleQuickView}
                className="h-[34px] w-[34px] rounded-lg bg-white shadow-md inline-flex items-center justify-center text-[#21313c] hover:bg-[#16135c] hover:text-white transition-colors duration-150 cursor-pointer"
                title="Quick View"
                aria-label="Quick View"
              >
                <Eye size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                className={`group/wish h-[34px] w-[34px] rounded-lg shadow-md inline-flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                  isWishlisted
                    ? 'bg-red-50 border border-red-200 hover:bg-[#16135c] hover:border-[#16135c]'
                    : 'bg-white hover:bg-[#16135c]'
                }`}
                title={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
                aria-label="Wishlist"
              >
                <Heart
                  size={16}
                  strokeWidth={2}
                  className={`transition-colors duration-150 ${
                    isWishlisted
                      ? 'fill-red-600 text-red-600 group-hover/wish:text-red-500 group-hover/wish:fill-red-500'
                      : 'text-[#21313c] group-hover/wish:text-red-500 group-hover/wish:fill-red-500'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={handleCompare}
                className={`h-[34px] w-[34px] rounded-lg bg-white shadow-md inline-flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                  isCompared
                    ? 'bg-[#16135c] text-white hover:bg-[#12104b]'
                    : 'text-[#21313c] hover:bg-[#16135c] hover:text-white'
                }`}
                title="Compare"
                aria-label="Compare"
              >
                <ArrowLeftRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Product Category & Title */}
          <div className="mt-3">
            <p className="text-xs text-[#889397] capitalize truncate">{categoryName}</p>
            <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-[#21313c] group-hover:text-[#16135c] transition-colors leading-snug">
              {product.title}
            </h3>

            {/* Review Stars & Count */}
            <div className="mt-1.5 flex items-center gap-1 text-[11px]">
              <div className="flex items-center gap-0.5 text-[#ffc107]">
                <Star size={13} className="fill-[#ffc107] text-[#ffc107]" />
                <Star size={13} className="fill-[#ffc107] text-[#ffc107]" />
                <Star size={13} className="fill-[#ffc107] text-[#ffc107]" />
                <Star size={13} className="fill-[#ffc107] text-[#ffc107]" />
                <Star size={13} className="fill-[#ffc107] text-[#ffc107]" />
              </div>
              <span className="font-semibold text-[#889397] ml-0.5">{ratingScore.toFixed(1)}</span>
              <span className="text-[#889397]">({reviewCount})</span>
            </div>
          </div>
        </Link>

        {/* Pricing, Chat and + Add Button */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-[#21313c] font-sans leading-none">
              {money(displayPricePaise)}
            </span>
            {originalPricePaise && originalPricePaise > displayPricePaise ? (
              <span className="text-xs text-[#889397] line-through font-normal">{money(originalPricePaise)}</span>
            ) : null}
            {discountPercent > 0 ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                {discountPercent}% OFF
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chat with Seller Button */}
            <button
              type="button"
              onClick={handleOpenChat}
              className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                canChat
                  ? 'border border-[#16135c]/25 bg-white text-[#16135c] hover:bg-[#16135c] hover:text-white'
                  : 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              title={isAuthenticated ? 'Chat with Seller' : 'Sign in to chat with sellers'}
            >
              <MessageCircle size={14} />
              <span>Chat</span>
            </button>

            {/* + Add / Remove Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSoldOut}
              className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                isInCart
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isSoldOut
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#16135c] hover:bg-[#12104b] text-white'
              }`}
              title={isInCart ? 'Remove from Cart' : isSoldOut ? 'Sold out' : 'Add to Cart'}
            >
              {isInCart ? (
                <>
                  <Trash2 size={13} />
                  <span>Remove</span>
                </>
              ) : isSoldOut ? (
                <span>Sold out</span>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick View Modal Overlay */}
      {quickViewOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setQuickViewOpen(false);
                }
              }}
            >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quickview-title-${product.id}`}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#dfe2e1]"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setQuickViewOpen(false)}
              className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-[#5c6c75] hover:bg-gray-200 hover:text-[#21313c] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6">
              {/* Product Media Column */}
              <div className="relative aspect-[4/3] md:aspect-square w-full overflow-hidden rounded-xl bg-[#f8f9fa] flex items-center justify-center border border-gray-100">
                <ProductMedia image={primary} alt={product.title} sku={product.sku} />
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                  <span
                    className={`inline-block rounded px-2.5 py-1 text-xs font-semibold leading-none shadow-2xs ${leftBadge.bg}`}
                  >
                    {leftBadge.text}
                  </span>
                  <span
                    className={`inline-block rounded px-2.5 py-1 text-xs font-semibold leading-none shadow-2xs ${stockBadge.bg}`}
                  >
                    {stockBadge.text}
                  </span>
                </div>
              </div>

              {/* Product Details Column */}
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#16135c]">{categoryName}</span>
                  <h2
                    id={`quickview-title-${product.id}`}
                    className="mt-1 text-lg font-bold text-[#21313c] leading-snug"
                  >
                    {product.title}
                  </h2>

                  {/* Rating Stars */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <div className="flex items-center gap-0.5 text-[#ffc107]">
                      <Star size={14} className="fill-[#ffc107] text-[#ffc107]" />
                      <Star size={14} className="fill-[#ffc107] text-[#ffc107]" />
                      <Star size={14} className="fill-[#ffc107] text-[#ffc107]" />
                      <Star size={14} className="fill-[#ffc107] text-[#ffc107]" />
                      <Star size={14} className="fill-[#ffc107] text-[#ffc107]" />
                    </div>
                    <span className="font-semibold text-[#21313c]">{ratingScore.toFixed(1)}</span>
                    <span className="text-[#889397]">({reviewCount} reviews)</span>
                  </div>

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-bold text-[#21313c]">{money(displayPricePaise)}</span>
                    {originalPricePaise && originalPricePaise > displayPricePaise ? (
                      <span className="text-sm text-[#889397] line-through">{money(originalPricePaise)}</span>
                    ) : null}
                    {discountPercent > 0 ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  {/* Description preview */}
                  <p className="mt-3 text-xs text-[#5c6c75] line-clamp-3 leading-relaxed">
                    {product.description || 'Fresh products delivered right to your doorstep.'}
                  </p>

                  {/* Wholesale Tiers Preview if available */}
                  {product.pricingTiers && product.pricingTiers.length > 0 ? (
                    <div className="mt-4 rounded-lg bg-gray-50 p-2.5 border border-gray-100">
                      <p className="text-[11px] font-bold text-[#21313c] uppercase tracking-wider">
                        Wholesale Tier Rates
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {product.pricingTiers.map((tier, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-[#5c6c75]">
                            <span>
                              {tier.minQuantity}+ {tier.maxQuantity ? `to ${tier.maxQuantity}` : ''} units
                            </span>
                            <span className="font-semibold text-[#16135c]">{money(tier.unitPricePaise)}/unit</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Bottom Modal Actions */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Quantity Selector */}
                    <div className="flex items-center rounded-lg border border-[#dfe2e1] bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(product.moq || 1, q - 1))}
                        disabled={quantity <= (product.moq || 1)}
                        className="px-2.5 py-1.5 text-gray-500 hover:text-[#16135c] disabled:opacity-30 cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-[#21313c]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="px-2.5 py-1.5 text-gray-500 hover:text-[#16135c] cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Add to Cart / Remove */}
                    <button
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => {
                        if (isInCart) {
                          removeCartItem(product.id);
                          setIsInCart(false);
                          showToast.info('Removed from cart', product.title);
                          setQuickViewOpen(false);
                          return;
                        }
                        addProductToCart({
                          productId: product.id,
                          title: product.title,
                          pricePaise: displayPricePaise,
                          quantity,
                          image: primary?.url,
                          sellerSlug: product.sellerSlug,
                        });
                        setIsInCart(true);
                        showToast.success('Added to cart', `${quantity} × ${product.title}`);
                        setQuickViewOpen(false);
                      }}
                      className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                        isInCart
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : isSoldOut
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-[#16135c] hover:bg-[#12104b] text-white'
                      }`}
                    >
                      {isInCart ? 'Remove from Cart' : isSoldOut ? 'No Stock' : 'Add to Cart'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickViewOpen(false);
                      navigate(`/product/${product.slug}`);
                    }}
                    className="block w-full text-center text-xs font-semibold text-[#16135c] hover:underline"
                  >
                    View Full Product Details →
                  </button>
                </div>
              </div>
            </div>
          </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
