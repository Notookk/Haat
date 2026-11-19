import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Trash2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useWishlistIds, clearWishlist, addProductToCart } from '../features/chat/chatStore';
import { usePublicProducts } from '../features/catalog/api';
import { ProductCard } from '../components/ProductCard';
import { showToast } from '@haat/shared-frontend';

export function WishlistPage() {
  const wishlistIds = useWishlistIds();
  const { data, isLoading } = usePublicProducts({ limit: 100 });

  const allProducts = data?.items || [];
  const wishlistedProducts = allProducts.filter((p) => wishlistIds.includes(p.id));

  const handleClearAll = () => {
    if (wishlistIds.length === 0) return;
    clearWishlist();
    showToast.info('Wishlist Cleared', 'All saved items were removed from your wishlist.');
  };

  const handleAddAllToCart = () => {
    let count = 0;
    wishlistedProducts.forEach((product) => {
      if (product.stockState !== 'SOLD_OUT') {
        const primary = product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null;
        addProductToCart({
          productId: product.id,
          title: product.title,
          pricePaise: product.retailPricePaise,
          quantity: product.moq || 1,
          image: primary?.url,
          sellerSlug: product.sellerSlug,
        });
        count++;
      }
    });
    if (count > 0) {
      showToast.success('Added to Cart', `${count} wishlist items added to your shopping cart.`);
    } else {
      showToast.info('Cart update', 'All wishlist items are currently sold out.');
    }
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
          <span className="font-semibold text-[#16135c]">My Wishlist</span>
        </div>
      </div>

      {/* 2. Main Container */}
      <div className="mx-auto max-w-container px-4 py-8 md:px-8">
        {/* Header Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-5">
          <div>
            <h1 className="text-2xl font-black text-[#16135c] sm:text-3xl flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-red-50 text-red-600 shadow-2xs">
                <Heart size={22} className="fill-red-600" />
              </span>
              <span>My Wishlist</span>
            </h1>
            <p className="mt-1 text-xs text-[#5c6c75]">
              Items you have saved to purchase later or monitor for wholesale deals.
            </p>
          </div>

          {wishlistIds.length > 0 ? (
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleAddAllToCart}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <ShoppingBag size={14} />
                <span>Add All to Cart</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-2xs transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear Wishlist</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Wishlist Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#889397]">
            <Loader2 size={24} className="animate-spin text-[#16135c] mb-3" />
            <p className="text-xs">Loading your saved items...</p>
          </div>
        ) : wishlistIds.length === 0 || wishlistedProducts.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-gray-200/80 bg-white p-12 text-center shadow-xs max-w-lg mx-auto mt-6">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-red-50 text-red-600 mb-5 shadow-2xs">
              <Heart size={38} className="fill-red-600/20 text-red-600 stroke-[1.8]" />
            </div>
            <h2 className="text-xl font-bold text-[#16135c]">Your Wishlist is Empty</h2>
            <p className="mt-2 text-xs text-[#5c6c75] leading-relaxed max-w-sm mx-auto">
              You haven&apos;t saved any products to your wishlist yet. Explore our fresh marketplace catalog and tap the heart icon on any product to save it here.
            </p>
            <div className="mt-6">
              <Link
                to="/catalogue"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#16135c] px-6 text-xs font-bold text-white shadow-xs hover:bg-[#12104b] transition-colors"
              >
                <span>Explore Catalog</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* Wishlisted Products Grid */
          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-[#5c6c75]">
              <span className="font-semibold text-[#16135c]">
                Showing {wishlistedProducts.length} Saved {wishlistedProducts.length === 1 ? 'Product' : 'Products'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Sparkles size={11} /> Saved in your account session
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {wishlistedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
