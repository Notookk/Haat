import type { ProductImage as ProductImageType } from '../../lib/types';

interface ProductImageProps {
  image: ProductImageType | null;
  alt: string;
  sku: string;
  className?: string;
  sizes?: string;
}

/**
 * Product media with an intentional fallback: a hairline texture plus the SKU in mono.
 * A missing image is a catalogue fact, not an error state.
 */
export function ProductMedia({ image, alt, sku, className }: ProductImageProps) {
  if (!image) {
    return (
      <div className={`img-fallback grid h-full w-full place-items-center ${className ?? ''}`} aria-hidden="true">
        <span className="px-3 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">{sku}</span>
      </div>
    );
  }

  return (
    <img
      src={image.url}
      alt={image.altText ?? alt}
      loading="lazy"
      decoding="async"
      className={`h-full w-full object-cover ${className ?? ''}`}
    />
  );
}
