import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building, ShieldCheck, MapPin, Star, AlertCircle, ShoppingBag, ArrowLeft } from 'lucide-react';
import { api, Badge, Button, SkeletonGrid, ErrorState, EmptyState, type Product } from '@haat/shared-frontend';
import { ProductCard } from '../components/ProductCard';

interface StorefrontResponse {
  store: {
    id: string;
    storeName: string;
    storeSlug: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    ratingAverage: number;
    ratingCount: number;
    servicePincodes?: string[];
    isVerified: boolean;
  };
  products: Product[];
}

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error, refetch } = useQuery<StorefrontResponse>({
    queryKey: ['storefront', slug],
    queryFn: async () => {
      const response = await api.get<StorefrontResponse>(`/stores/${slug}`);
      return response.data;
    },
    enabled: Boolean(slug),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="container-page py-8 space-y-6">
        <div className="h-48 rounded-2xl bg-surface-sunken animate-pulse" />
        <SkeletonGrid count={8} />
      </div>
    );
  }

  if (error || !data?.store) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center space-y-4 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Storefront Unavailable</h2>
          <p className="text-body text-ink-600">
            This merchant storefront is not available, has changed its address, or is currently inactive.
          </p>
          <div className="pt-2">
            <Link to="/catalogue">
              <Button variant="primary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { store, products } = data;

  return (
    <div className="min-h-screen bg-canvas pb-16">
      {/* Store Banner / Header */}
      <div className="border-b border-line bg-surface">
        <div className="container-page py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 font-extrabold text-2xl shadow-xs">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.storeName} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  store.storeName.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-display-sm font-extrabold text-ink-900 leading-tight">{store.storeName}</h1>
                  {store.isVerified ? (
                    <Badge tone="success" className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Verified Merchant</span>
                    </Badge>
                  ) : null}
                </div>

                <p className="text-caption text-ink-500 max-w-xl">
                  {store.description || 'Verified local marketplace merchant.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-caption text-ink-600">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <strong>{store.ratingAverage.toFixed(1)}</strong> ({store.ratingCount} reviews)
                  </span>

                  {store.servicePincodes && store.servicePincodes.length > 0 ? (
                    <span className="flex items-center gap-1 text-ink-500 font-mono text-micro">
                      <MapPin className="h-3.5 w-3.5 text-brand-600" />
                      Delivering to {store.servicePincodes.length} pincodes
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/catalogue">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  All Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Product Listings Grid */}
      <div className="container-page py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-600" />
            <h2 className="text-label font-bold text-ink-900">Products from {store.storeName}</h2>
          </div>
          <span className="text-caption text-ink-500 font-semibold">{products.length} Items Available</span>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<Building size={20} />}
            title="No active listings"
            description="This store currently has no active products listed in the catalogue."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
