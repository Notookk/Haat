import { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingBag,
  MessageCircle,
  ZoomIn,
  ShieldCheck,
  Clock,
  RefreshCw,
  Check,
  Copy,
  Store,
  ChevronRight,
  Minus,
  Plus,
  Package,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  EmptyState,
  ErrorState,
  SkeletonBlock,
  money,
  moneyExact,
  quantityRange,
  errorMessage,
  showToast,
} from '@haat/shared-frontend';
import { usePublicProduct } from '../features/catalog/api';
import { useAuth } from '../features/auth/AuthProvider';
import {
  addProductToCart,
  removeCartItem,
  toggleWishlistProduct,
  isProductWishlisted,
  isProductInCart,
} from '../features/chat/chatStore';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const product = usePublicProduct(slug);
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'wholesale'>('desc');
  const [skuCopied, setSkuCopied] = useState(false);

  // Interactive mouse zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Handle cursor movement inside main image container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  if (product.isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8" aria-busy="true">
        <SkeletonBlock className="h-4 w-64 mb-6" />
        <div className="grid gap-10 md:grid-cols-2">
          <SkeletonBlock className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-9 w-full" />
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-12 w-40" />
            <SkeletonBlock className="h-28 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (product.isError) {
    const notFound = errorMessage(product.error).toLowerCase().includes('not found');
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        {notFound ? (
          <EmptyState
            title="This listing isn’t available"
            description="It may have been removed by the merchant or is currently inactive."
            action={
              <Link
                to="/catalogue"
                className="inline-flex items-center gap-2 rounded-xl bg-[#16135c] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#12104b] transition-colors"
              >
                Browse Catalogue →
              </Link>
            }
          />
        ) : (
          <ErrorState message={errorMessage(product.error)} onRetry={() => void product.refetch()} />
        )}
      </div>
    );
  }

  const item = product.data;
  if (!item) return null;

  const [isInCart, setIsInCart] = useState(() => isProductInCart(item.id));

  useEffect(() => {
    const handleCartChange = () => {
      setIsInCart(isProductInCart(item.id));
    };
    window.addEventListener('haat_cart_updated', handleCartChange);
    window.addEventListener('storage', handleCartChange);
    return () => {
      window.removeEventListener('haat_cart_updated', handleCartChange);
      window.removeEventListener('storage', handleCartChange);
    };
  }, [item.id]);

  const images = item.images && item.images.length > 0 ? item.images : [];
  const current = images[Math.min(activeImage, Math.max(0, images.length - 1))] ?? null;
  const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const shown = current ?? primary;

  const categoryLabel =
    item.categoryName || item.categoryPath.split('/').slice(-1)[0]?.replace(/-/g, ' ') || 'General';

  const totalUnits =
    item.totalStock ?? item.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
  const isOutOfStock = totalUnits <= 0;
  const isLowStock = totalUnits > 0 && totalUnits <= 10;
  const stockLabel = isOutOfStock ? 'Sold Out' : isLowStock ? `Only ${totalUnits} Left` : 'In Stock';

  const originalPricePaise =
    item.totalPricePaise && item.totalPricePaise > item.retailPricePaise
      ? item.totalPricePaise
      : item.discountPercent && item.discountPercent > 0
        ? Math.round(item.retailPricePaise / (1 - item.discountPercent / 100))
        : null;

  const discountPercent =
    item.discountPercent ||
    (originalPricePaise && originalPricePaise > item.retailPricePaise
      ? Math.round(((originalPricePaise - item.retailPricePaise) / originalPricePaise) * 100)
      : 0);

  const savingsPaise = originalPricePaise ? originalPricePaise - item.retailPricePaise : 0;

  const moq = item.moq || 1;
  const step = item.orderMultiple || 1;

  const handleCopySku = () => {
    navigator.clipboard.writeText(item.sku);
    setSkuCopied(true);
    showToast.info('SKU Copied', item.sku);
    setTimeout(() => setSkuCopied(false), 2000);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (isInCart) {
      removeCartItem(item.id);
      setIsInCart(false);
      showToast.info('Removed from Cart', item.title);
      return;
    }
    addProductToCart({
      productId: item.id,
      title: item.title,
      pricePaise: item.retailPricePaise,
      quantity,
      image: primary?.url,
      sellerSlug: item.sellerSlug,
    });
    setIsInCart(true);
    showToast.success('Added to Cart', `${quantity} × ${item.title}`);
  };

  const handleOpenChat = () => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams();
    if (item.sellerSlug) params.set('seller', item.sellerSlug);
    if (item.sellerName) params.set('sellerName', item.sellerName);
    if (item.id) params.set('productId', item.id);
    if (item.title) params.set('productTitle', item.title);
    if (item.sku) params.set('sku', item.sku);
    if (primary?.url) params.set('productImage', primary.url);
    if (item.retailPricePaise) params.set('price', String(item.retailPricePaise));
    navigate(`/chat?${params.toString()}`);
  };

  const isWishlisted = isProductWishlisted(item.id);
  const handleToggleWishlist = () => {
    const next = toggleWishlistProduct(item.id);
    showToast.success(next ? 'Added to Wishlist' : 'Removed from Wishlist', item.title);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16">
      {/* 1. Breadcrumb Navigation */}
      <div className="border-b border-gray-200/80 bg-white py-3">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-[#5c6c75]">
            <Link to="/" className="hover:text-[#16135c] transition-colors">
              Home
            </Link>
            <ChevronRight size={13} className="text-gray-400" />
            <Link to="/catalogue" className="hover:text-[#16135c] transition-colors">
              Catalogue
            </Link>
            <ChevronRight size={13} className="text-gray-400" />
            <Link
              to={`/catalogue?category=${encodeURIComponent(item.categoryPath.split('/')[0] ?? '')}`}
              className="capitalize hover:text-[#16135c] transition-colors"
            >
              {categoryLabel}
            </Link>
            <ChevronRight size={13} className="text-gray-400" />
            <span className="font-semibold text-[#16135c] truncate max-w-xs">{item.title}</span>
          </nav>
        </div>
      </div>

      {/* 2. Main Product Showcase */}
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Image Gallery with Hover Zoom (Span 6) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="sticky top-20">
              {/* Main Image Frame with Smooth Cursor-Tracking Zoom Lens */}
              <div
                className="group relative aspect-square sm:aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 flex items-center justify-center shadow-xs select-none"
                style={{ cursor: isZoomed ? 'crosshair' : 'zoom-in' }}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setIsZoomed(false)}
              >
                {/* The Product Image with dynamic transform-origin following cursor */}
                {shown?.url ? (
                  <img
                    src={shown.url}
                    alt={item.title}
                    className="h-full w-full object-contain transition-transform duration-100 ease-out pointer-events-none"
                    style={{
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Package size={48} strokeWidth={1.5} />
                    <span className="mt-2 text-xs font-semibold">No Image Available</span>
                  </div>
                )}

                {/* Top-Left: Discount Badge */}
                {discountPercent > 0 ? (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#16135c] px-2.5 py-1 text-xs font-bold text-white shadow-xs tracking-wide">
                      {discountPercent}% OFF
                    </span>
                  </div>
                ) : null}

                {/* Top-Right: Stock Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold shadow-2xs ${
                      isOutOfStock
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : isLowStock
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    <span>{stockLabel}</span>
                  </span>
                </div>

                {/* Bottom-Right: Hover Zoom Hint Pill */}
                <div
                  className={`absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs transition-opacity duration-200 pointer-events-none ${
                    isZoomed ? 'opacity-0' : 'opacity-85 group-hover:opacity-100'
                  }`}
                >
                  <ZoomIn size={13} />
                  <span>Hover over image to zoom</span>
                </div>
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 ? (
                <div className="mt-3.5 flex items-center gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      onMouseEnter={() => setActiveImage(idx)}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 p-1.5 transition-all cursor-pointer bg-white ${
                        idx === activeImage
                          ? 'border-[#16135c] ring-2 ring-[#16135c]/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Trust Badges Strip Under Gallery */}
              <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
                <div className="flex flex-col items-center text-center p-1">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-[#16135c] mb-1.5">
                    <Clock size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[#21313c]">Slot Delivery</span>
                  <span className="text-[10px] text-gray-500">Scheduled doorstep</span>
                </div>

                <div className="flex flex-col items-center text-center p-1 border-x border-gray-100">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-1.5">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[#21313c]">100% Genuine</span>
                  <span className="text-[10px] text-gray-500">Direct from seller</span>
                </div>

                <div className="flex flex-col items-center text-center p-1">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-amber-600 mb-1.5">
                    <RefreshCw size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[#21313c]">Easy Support</span>
                  <span className="text-[10px] text-gray-500">Live chat ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Product Info & Purchase Action Hub (Span 6) */}
          <div className="lg:col-span-6 flex flex-col space-y-5">
            {/* Store & Category Tag Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Link
                  to={`/catalogue?category=${encodeURIComponent(item.categoryPath.split('/')[0] ?? '')}`}
                  className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-[#16135c] hover:bg-blue-100 transition-colors"
                >
                  {categoryLabel}
                </Link>
                {item.brand ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {item.brand}
                  </span>
                ) : null}
              </div>

              <Link
                to={`/store/${item.sellerSlug}`}
                className="group flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#16135c] transition-colors"
              >
                <Store size={14} className="text-gray-400 group-hover:text-[#16135c]" />
                <span>By {item.sellerName}</span>
                <ShieldCheck size={14} className="text-emerald-600" />
              </Link>
            </div>

            {/* Product Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#21313c] leading-tight">
                {item.title}
              </h1>

              {/* SKU & Ratings Row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-amber-500">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-[#21313c] ml-1">4.5</span>
                  <span className="text-gray-400">(25 reviews)</span>
                </div>

                <span className="text-gray-300">|</span>

                <button
                  type="button"
                  onClick={handleCopySku}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-[#16135c] transition-colors font-mono cursor-pointer"
                  title="Click to copy SKU"
                >
                  <span>SKU: {item.sku}</span>
                  {skuCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Price Card */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-[#16135c] tracking-tight">
                  {money(item.retailPricePaise)}
                </span>

                {originalPricePaise && originalPricePaise > item.retailPricePaise ? (
                  <span className="text-lg text-gray-400 line-through font-normal">
                    {money(originalPricePaise)}
                  </span>
                ) : null}

                {discountPercent > 0 ? (
                  <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    {discountPercent}% OFF
                  </span>
                ) : null}
              </div>

              {savingsPaise > 0 ? (
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <Sparkles size={13} />
                  <span>You save {money(savingsPaise)} on this item!</span>
                </p>
              ) : null}

              <p className="text-xs text-gray-400">
                Inclusive of all taxes · Orders delivered via scheduled slots
              </p>
            </div>

            {/* Stock, MOQ & Quantity Controls */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Availability:</span>
                  <span
                    className={`text-xs font-bold ${isOutOfStock ? 'text-red-600' : 'text-emerald-700'}`}
                  >
                    {isOutOfStock ? 'Out of stock' : `${totalUnits} Units in Stock`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="rounded bg-gray-100 px-2 py-0.5 font-medium">MOQ: {moq}</span>
                  {step > 1 ? (
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-medium">Multiples of {step}</span>
                  ) : null}
                </div>
              </div>

              {/* Quantity Stepper & Add to Cart Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Quantity Stepper */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-2xs sm:w-36 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(moq, q - step))}
                    disabled={quantity <= moq || isOutOfStock}
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#16135c] disabled:opacity-30 transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="text-sm font-bold text-[#21313c] tnum">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + step)}
                    disabled={isOutOfStock || quantity >= totalUnits}
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#16135c] disabled:opacity-30 transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Primary Add / Remove Button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                    isInCart
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : isOutOfStock
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#16135c] hover:bg-[#12104b] text-white hover:shadow-lg'
                  }`}
                >
                  {isInCart ? (
                    <>
                      <Trash2 size={18} />
                      <span>Remove from Cart</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>Currently Unavailable</span>
                  ) : (
                    <>
                      <ShoppingBag size={18} />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>

                {/* Wishlist Icon Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`group/wish grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-[#16135c] hover:border-[#16135c]'
                      : 'border-gray-200 bg-white text-[#5c6c75] hover:bg-[#16135c] hover:border-[#16135c]'
                  }`}
                  title={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
                >
                  <Heart
                    size={20}
                    className={`transition-colors duration-150 ${
                      isWishlisted
                        ? 'fill-red-600 text-red-600 group-hover/wish:text-red-500 group-hover/wish:fill-red-500'
                        : 'group-hover/wish:text-red-500 group-hover/wish:fill-red-500'
                    }`}
                  />
                </button>
              </div>

              {/* Chat with Seller Button */}
              <button
                type="button"
                onClick={handleOpenChat}
                disabled={!isAuthenticated}
                className={`w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl font-bold text-xs shadow-2xs transition-colors ${
                  isAuthenticated
                    ? 'border-2 border-[#16135c]/30 bg-white text-[#16135c] hover:bg-[#16135c] hover:text-white cursor-pointer'
                    : 'border-2 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                }`}
                title={isAuthenticated ? `Chat with ${item.sellerName}` : 'Sign in to chat with sellers'}
              >
                <MessageCircle size={16} />
                <span>
                  {isAuthenticated
                    ? `Chat with ${item.sellerName} About This Product`
                    : 'Sign in to chat with seller'}
                </span>
              </button>
            </div>

            {/* Wholesale Pricing Tiers Banner (if configured) */}
            {item.pricingTiers && item.pricingTiers.length > 0 ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs font-bold text-[#16135c] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} />
                    <span>Wholesale Bulk Pricing</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-brand-700">
                    {item.pricingTiers.length} Tiers Available
                  </span>
                </div>
                <div className="divide-y divide-blue-100 text-xs">
                  {item.pricingTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5">
                      <span className="text-gray-600 font-medium">
                        {quantityRange(tier.minQuantity, tier.maxQuantity)}
                      </span>
                      <span className="font-bold text-[#16135c]">{money(tier.unitPricePaise)} / unit</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 3. Detailed Tabs Section (Description, Specifications, Wholesale) */}
        <div className="mt-12 rounded-2xl border border-gray-200/80 bg-white shadow-2xs overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-100 bg-[#f8f9fa] px-4 md:px-6">
            <button
              type="button"
              onClick={() => setActiveTab('desc')}
              className={`py-4 px-4 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                activeTab === 'desc'
                  ? 'border-[#16135c] text-[#16135c] bg-white'
                  : 'border-transparent text-gray-500 hover:text-[#16135c]'
              }`}
            >
              Description & Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`py-4 px-4 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                activeTab === 'specs'
                  ? 'border-[#16135c] text-[#16135c] bg-white'
                  : 'border-transparent text-gray-500 hover:text-[#16135c]'
              }`}
            >
              Specifications
            </button>
            {item.pricingTiers && item.pricingTiers.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveTab('wholesale')}
                className={`py-4 px-4 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'wholesale'
                    ? 'border-[#16135c] text-[#16135c] bg-white'
                    : 'border-transparent text-gray-500 hover:text-[#16135c]'
                }`}
              >
                Wholesale Tiers ({item.pricingTiers.length})
              </button>
            ) : null}
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8">
            {activeTab === 'desc' && (
              <div className="max-w-3xl space-y-4">
                <h3 className="text-base font-bold text-[#21313c]">About {item.title}</h3>
                <p className="whitespace-pre-line text-sm text-[#5c6c75] leading-relaxed">
                  {item.description || 'No detailed description provided for this listing.'}
                </p>

                <div className="mt-6 rounded-xl bg-gray-50 p-4 border border-gray-100 text-xs text-gray-600 space-y-1.5">
                  <p className="font-bold text-[#16135c]">HAAT Quality & Delivery Guarantee</p>
                  <p>
                    All grocery and packaged items are stored in temperature-managed facilities and dispatched directly
                    by verified local sellers. Select your preferred scheduled delivery slot at checkout for doorstep
                    convenience.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="max-w-2xl">
                <dl className="divide-y divide-gray-100 text-xs">
                  <div className="grid grid-cols-3 py-2.5">
                    <dt className="font-semibold text-gray-500">Product Title</dt>
                    <dd className="col-span-2 font-medium text-[#21313c]">{item.title}</dd>
                  </div>
                  <div className="grid grid-cols-3 py-2.5">
                    <dt className="font-semibold text-gray-500">SKU Code</dt>
                    <dd className="col-span-2 font-mono font-bold text-[#16135c]">{item.sku}</dd>
                  </div>
                  <div className="grid grid-cols-3 py-2.5">
                    <dt className="font-semibold text-gray-500">Category</dt>
                    <dd className="col-span-2 font-medium text-[#21313c]">{categoryLabel}</dd>
                  </div>
                  {item.brand ? (
                    <div className="grid grid-cols-3 py-2.5">
                      <dt className="font-semibold text-gray-500">Brand</dt>
                      <dd className="col-span-2 font-medium text-[#21313c]">{item.brand}</dd>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 py-2.5">
                    <dt className="font-semibold text-gray-500">Merchant Store</dt>
                    <dd className="col-span-2">
                      <Link
                        to={`/store/${item.sellerSlug}`}
                        className="font-bold text-[#16135c] hover:underline"
                      >
                        {item.sellerName}
                      </Link>
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 py-2.5">
                    <dt className="font-semibold text-gray-500">Total Stock Available</dt>
                    <dd className="col-span-2 font-bold text-emerald-700">{totalUnits} units</dd>
                  </div>
                  <div className="grid grid-cols-3 py-2.5">
                    <dt className="font-semibold text-gray-500">Min. Order Quantity (MOQ)</dt>
                    <dd className="col-span-2 font-medium text-[#21313c]">{moq} units</dd>
                  </div>
                </dl>
              </div>
            )}

            {activeTab === 'wholesale' && item.pricingTiers && (
              <div className="max-w-2xl">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left uppercase text-gray-500 font-bold">
                      <th className="py-2.5">Order Quantity</th>
                      <th className="py-2.5 text-right">Price Per Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {item.pricingTiers.map((tier, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-gray-700 font-medium">
                          {quantityRange(tier.minQuantity, tier.maxQuantity)}
                        </td>
                        <td className="py-3 text-right font-bold text-[#16135c]">
                          {money(tier.unitPricePaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
