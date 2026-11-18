import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { PaginationMeta, Product, UploadSignature } from '../../lib/types';
import { catalogKeys, toQueryString } from '../catalog/api';

export interface ProductWritePayload {
  title: string;
  description: string;
  sku: string;
  brand?: string;
  categoryId: string;
  retailPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
  /** Only honoured on PATCH; the create endpoint always starts a listing as active. */
  isActive?: boolean;
  variants: Array<{
    id?: string;
    sku: string;
    title: string;
    priceModifierPaise: number;
    stockQuantity: number;
    attributes: Record<string, string>;
  }>;
  images: Array<{
    id?: string;
    url: string;
    publicId?: string;
    altText?: string;
    displayOrder: number;
    isPrimary: boolean;
  }>;
  pricingTiers: Array<{ minQuantity: number; maxQuantity: number | null; unitPricePaise: number }>;
}

export interface MyProductsQuery {
  q?: string;
  page?: number;
  limit?: number;
}

export const myProductKeys = {
  list: (query: MyProductsQuery) => ['seller', 'products', query] as const,
  detail: (id: string) => ['seller', 'product', id] as const,
};

export function useMyProducts(query: MyProductsQuery) {
  return useQuery({
    queryKey: myProductKeys.list(query),
    queryFn: async ({ signal }) => {
      const result = await api.get<{ items: Product[] }>(`/products/mine${toQueryString(query)}`, signal);
      return { items: result.data.items, meta: result.meta as PaginationMeta | undefined };
    },
  });
}

export function useMyProduct(id: string | undefined) {
  return useQuery({
    queryKey: myProductKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const result = await api.get<{ product: Product }>(`/products/mine/${id}`, signal);
      return result.data.product;
    },
  });
}

function useInvalidateSellerProducts() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['seller', 'products'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async (payload: ProductWritePayload) => {
      const result = await api.post<{ product: Product }>('/products', payload);
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateProduct(id: string) {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async (payload: ProductWritePayload) => {
      const result = await api.patch<{ product: Product }>(`/products/${id}`, payload);
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

export function useArchiveProduct() {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api.delete<{ product: Product }>(`/products/${id}`);
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Signed direct upload to Cloudinary. The image never touches the API server. */
export async function uploadProductImage(file: File): Promise<{ url: string; publicId: string }> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error('Use a JPG, PNG or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  const signatureResult = await api.post<{ upload: UploadSignature; maxImageBytes: number }>('/uploads/signature', {});
  const upload = signatureResult.data.upload;

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', upload.apiKey);
  form.append('timestamp', String(upload.timestamp));
  form.append('folder', upload.folder);
  form.append('signature', upload.signature);
  if (upload.uploadPreset) form.append('upload_preset', upload.uploadPreset);

  const response = await fetch(upload.uploadUrl, { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error('The image host rejected this file. Try a different image.');
  }

  const body = (await response.json()) as { secure_url?: string; public_id?: string };
  if (!body.secure_url || !body.public_id) {
    throw new Error('The image host returned an unexpected response.');
  }
  return { url: body.secure_url, publicId: body.public_id };
}
