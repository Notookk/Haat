import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, PackageSearch, Clock, ShieldCheck, Tag, RefreshCw, ChevronLeft, ChevronRight, FolderTree } from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  SkeletonBlock,
  SkeletonGrid,
  errorMessage,
  type CategoryNode,
} from '@haat/shared-frontend';
import { ProductCard } from '../components/ProductCard';
import { useCategoryTree, usePublicProducts } from '../features/catalog/api';

const SLIDES = [
  {
    badge: 'Opening Sale Discount 50%',
    title: 'SuperMarket For Fresh Grocery',
    description: 'Introduced a new model for online grocery shopping and convenient home delivery.',
    bg: '/brand/hero-slide-1.jpg',
    btnText: 'Shop Now',
    btnLink: '/catalogue',
  },
  {
    badge: 'Direct Wholesale · 30 Min Delivery',
    title: '30 Minutes Fast Delivery',
    description: 'Order bulk wholesale lots or daily essentials delivered with guaranteed scheduled time slots.',
    bg: '/brand/hero-slide-2.jpg',
    btnText: 'Shop Deals Now',
    btnLink: '/catalogue?sort=price-asc',
  },
];

const FEATURED_CATEGORIES = [
  {
    name: 'Tea, Coffee & Drinks',
    slug: 'tea-coffee-drinks',
    image: '/brand/categories/category-tea-coffee-drinks.jpg',
  },
  {
    name: 'Atta, Rice & Dal',
    slug: 'atta-rice-dal',
    image: '/brand/categories/category-atta-rice-dal.jpg',
  },
  {
    name: 'Dairy, Bread & Eggs',
    slug: 'dairy-bread-eggs',
    image: '/brand/categories/category-dairy-bread-eggs.jpg',
  },
  {
    name: 'Snack & Munchies',
    slug: 'snack-munchies',
    image: '/brand/categories/category-snack-munchies.jpg',
  },
  {
    name: 'Bakery & Biscuits',
    slug: 'bakery-biscuits',
    image: '/brand/categories/category-bakery-biscuits.jpg',
  },
  {
    name: 'Instant Food',
    slug: 'instant-food',
    image: '/brand/categories/category-instant-food.jpg',
  },
  {
    name: 'Baby Care',
    slug: 'baby-care',
    image: '/brand/categories/category-baby-care.jpg',
  },
  {
    name: 'Chicken, Meat & Fish',
    slug: 'chicken-meat-fish',
    image: '/brand/categories/category-chicken-meat-fish.jpg',
  },
  {
    name: 'Cleaning Essentials',
    slug: 'cleaning-essentials',
    image: '/brand/categories/category-cleaning-essentials.jpg',
  },
  {
    name: 'Pet Care',
    slug: 'pet-care',
    image: '/brand/categories/category-pet-care.jpg',
  },
];

function subtreeCount(node: CategoryNode): number {
  return node.productCount + node.children.reduce((total, child) => total + subtreeCount(child), 0);
}

export function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const categories = useCategoryTree();
  const products = usePublicProducts({ limit: 10, sort: 'newest' });

  const rawRoots = categories.data ?? [];
  const roots = useMemo(() => {
    return [...rawRoots].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return a.id.localeCompare(b.id);
    });
  }, [rawRoots]);

  const items = products.data?.items ?? [];

  // Embla Carousel with momentum mouse drag-to-scroll (dragFree: true)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const isDraggingRef = useRef(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    const onPointerDown = () => {
      isDraggingRef.current = false;
    };
    const onScroll = () => {
      isDraggingRef.current = true;
    };

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('pointerDown', onPointerDown);
    emblaApi.on('scroll', onScroll);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
      emblaApi.off('pointerDown', onPointerDown);
      emblaApi.off('scroll', onScroll);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, roots]);

  const scrollCategories = useCallback(
    (direction: 'left' | 'right') => {
      if (!emblaApi) return;
      if (direction === 'left') {
        emblaApi.scrollPrev();
      } else {
        emblaApi.scrollNext();
      }
    },
    [emblaApi],
  );

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent navigation if the user dragged the carousel
      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [],
  );

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white">
      {/* HAAT Stretched Hero Banner Slider Section */}
      <section className="mx-auto max-w-container px-4 md:px-8 mt-6 mb-8">
        <div
          className="relative min-h-[460px] sm:min-h-[520px] md:min-h-[560px] lg:min-h-[580px] w-full overflow-hidden rounded-2xl md:rounded-3xl bg-[#e8ebfb] transition-all duration-500 ease-out flex items-center shadow-xs"
          style={{
            backgroundImage: `url(${SLIDES[activeSlide].bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Left Text Content */}
          <div className="py-12 sm:py-16 md:py-24 lg:py-28 px-6 sm:px-12 md:px-16 lg:px-20 w-full md:w-3/5 lg:w-[48%] z-10">
            <span className="inline-block rounded-md bg-[#ffc107] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#21313c] shadow-2xs">
              {SLIDES[activeSlide].badge}
            </span>

            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold text-[#21313c] tracking-tight leading-[1.15]">
              {SLIDES[activeSlide].title}
            </h1>

            <p className="mt-3.5 text-base md:text-lg text-[#5c6c75] max-w-md leading-relaxed font-normal">
              {SLIDES[activeSlide].description}
            </p>

            <Link
              to={SLIDES[activeSlide].btnLink}
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#21313c] hover:bg-[#16222b] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:shadow transition-all hover:translate-x-0.5 cursor-pointer"
            >
              <span>{SLIDES[activeSlide].btnText}</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`transition-all duration-200 cursor-pointer ${
                  activeSlide === index
                    ? 'h-2 w-6 rounded-full bg-[#16135c]'
                    : 'h-2 w-2 rounded-full bg-[#16135c]/40 hover:bg-[#16135c]'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories (HAAT Stretched Section matching image) */}
      <section className="mx-auto max-w-container px-4 md:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#21313c]">Featured Categories</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              disabled={!canScrollPrev}
              className={`grid h-9 w-9 place-items-center rounded-full border border-[#dfe2e1] bg-white text-[#5c6c75] transition-colors shadow-2xs ${
                canScrollPrev
                  ? 'hover:border-[#16135c] hover:bg-[#f8f9fa] hover:text-[#16135c] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              aria-label="Previous categories"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              disabled={!canScrollNext}
              className={`grid h-9 w-9 place-items-center rounded-full border border-[#dfe2e1] bg-white text-[#5c6c75] transition-colors shadow-2xs ${
                canScrollNext
                  ? 'hover:border-[#16135c] hover:bg-[#f8f9fa] hover:text-[#16135c] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              aria-label="Next categories"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {categories.isPending ? (
          <div className="flex gap-4 overflow-hidden pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-52 w-44 sm:w-48 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />
        ) : roots.length === 0 ? (
          <EmptyState
            icon={<FolderTree size={20} className="text-[#889397]" aria-hidden="true" />}
            title="No categories found"
            description="There are currently no categories in the marketplace database."
          />
        ) : (
          <div
            ref={emblaRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none pb-4"
          >
            <div className="flex gap-4">
              {roots.map((cat) => {
                const matchedPreset = FEATURED_CATEGORIES.find(
                  (p) =>
                    p.slug === cat.slug ||
                    p.name.toLowerCase().includes(cat.name.toLowerCase().split(' ')[0]) ||
                    cat.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]),
                );
                const imageSrc = cat.imageUrl || matchedPreset?.image || '/brand/haat-mark-128.png';

                return (
                  <div key={cat.id} className="shrink-0 w-44 sm:w-48">
                    <Link
                      to={`/catalogue?category=${encodeURIComponent(cat.slug)}`}
                      onClick={handleCardClick}
                      draggable={false}
                      className="group flex flex-col items-center justify-between rounded-xl border border-[#dfe2e1] bg-white p-5 text-center transition-all duration-200 hover:border-[#16135c] hover:shadow-md h-52 cursor-pointer w-full select-none"
                    >
                      <div className="h-28 w-full flex items-center justify-center overflow-hidden pointer-events-none">
                        <img
                          src={imageSrc}
                          alt={cat.name}
                          draggable={false}
                          className="max-h-24 w-auto object-contain transition-transform duration-200 group-hover:scale-105 pointer-events-none select-none"
                          loading="lazy"
                        />
                      </div>
                      <div className="pointer-events-none select-none">
                        <span className="mt-3 text-sm font-semibold text-[#21313c] group-hover:text-[#16135c] transition-colors leading-snug line-clamp-2">
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-[#889397]">
                          {subtreeCount(cat)} product{subtreeCount(cat) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Popular Products Section */}
      <section className="mx-auto max-w-container px-4 md:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#21313c]">Popular Products</h2>
            <p className="text-xs text-[#889397] mt-0.5">Fresh stock, verified sellers and wholesale lots</p>
          </div>
          <Link to="/catalogue" className="text-xs font-semibold text-[#16135c] hover:underline">
            View All →
          </Link>
        </div>

        <div>
          {products.isPending ? (
            <SkeletonGrid count={10} />
          ) : products.isError ? (
            <ErrorState message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={20} strokeWidth={1.75} className="text-[#889397]" aria-hidden="true" />}
              title="No product in this section"
              description="There are currently no products available in this section. Explore our categories or check back soon."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link to="/catalogue">Browse catalogue</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Perks Bar matching user design with pure white background */}
      <section className="bg-white py-12 mt-6">
        <div className="mx-auto grid max-w-container gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 md:px-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8ebfb] text-[#16135c]">
              <Clock size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#21313c]">10 Minute Grocery / Slots</h4>
              <p className="text-xs text-[#5c6c75] mt-1 leading-relaxed">
                Choose scheduled delivery time slots that fit your daily routine.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8ebfb] text-[#16135c]">
              <Tag size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#21313c]">Best Prices &amp; Offers</h4>
              <p className="text-xs text-[#5c6c75] mt-1 leading-relaxed">
                Cheaper prices than your local supermarket, plus wholesale tier rates.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8ebfb] text-[#16135c]">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#21313c]">Wide Assortment</h4>
              <p className="text-xs text-[#5c6c75] mt-1 leading-relaxed">
                Choose from 5000+ products across food, personal care, and household.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8ebfb] text-[#16135c]">
              <RefreshCw size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#21313c]">Easy Returns &amp; Refund</h4>
              <p className="text-xs text-[#5c6c75] mt-1 leading-relaxed">
                Not satisfied with a product? Return it at the doorstep &amp; get a refund.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
