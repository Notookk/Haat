import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginationMeta, type Product, type UploadSignature } from '@haat/shared-frontend';

export interface ProductWritePayload {
  id?: string;
  title: string;
  description: string;
  sku: string;
  brand?: string;
  categoryId: string;
  totalPricePaise?: number;
  discountPercent?: number;
  retailPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
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
  category?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc';
}

function toQueryString(query: MyProductsQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.category) params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);
  const str = params.toString();
  return str ? `?${str}` : '';
}

export const myProductKeys = {
  list: (query: MyProductsQuery) => ['seller', 'products', query] as const,
  detail: (id: string) => ['seller', 'product', id] as const,
  categories: ['seller', 'categories'] as const,
};

export function useMyProducts(query: MyProductsQuery = {}) {
  return useQuery({
    queryKey: myProductKeys.list(query),
    queryFn: async ({ signal }) => {
      const result = await api.get<{ items: Product[] }>(`/api/v1/seller/products${toQueryString(query)}`, signal);
      return { items: result.data.items, meta: result.meta as PaginationMeta | undefined };
    },
  });
}

export function useMyProduct(id: string | undefined) {
  return useQuery({
    queryKey: myProductKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const result = await api.get<{ product: Product }>(`/api/v1/seller/products/${id}`, signal);
      return result.data.product;
    },
  });
}

export function useSellerCategories() {
  return useQuery({
    queryKey: myProductKeys.categories,
    queryFn: async () => {
      const res = await api.get<{
        categories: Array<{
          _id: string;
          name: string;
          slug: string;
          description?: string | null;
          imageUrl?: string | null;
          imagePublicId?: string | null;
        }>;
      }>('/api/v1/seller/categories');
      return res.data.categories;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      imageUrl?: string | null;
      imagePublicId?: string | null;
    }) => {
      const res = await api.post<{
        category: {
          _id: string;
          name: string;
          slug: string;
          description?: string | null;
          imageUrl?: string | null;
          imagePublicId?: string | null;
        };
      }>('/api/v1/seller/categories', data);
      return res.data.category;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myProductKeys.categories });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description?: string;
      imageUrl?: string | null;
      imagePublicId?: string | null;
    }) => {
      const { id, ...payload } = data;
      const res = await api.patch<{
        category: {
          _id: string;
          name: string;
          slug: string;
          description?: string | null;
          imageUrl?: string | null;
          imagePublicId?: string | null;
        };
      }>(`/api/v1/seller/categories/${id}`, payload);
      return res.data.category;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myProductKeys.categories });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ message: string; id: string }>(`/api/v1/seller/categories/${id}`);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myProductKeys.categories });
    },
  });
}

function useInvalidateSellerProducts() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['seller', 'products'] }),
      queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard'] }),
    ]);
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async (payload: ProductWritePayload) => {
      const result = await api.post<{ product: Product }>('/api/v1/seller/products', payload);
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateProduct(defaultId?: string) {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async (payload: ProductWritePayload & { id?: string }) => {
      const targetId = payload.id || defaultId;
      if (!targetId) throw new Error('Product ID is required for update.');
      const result = await api.put<{ product: Product }>(`/api/v1/seller/products/${targetId}`, payload);
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

export function useArchiveProduct() {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api.delete<{ product: Product }>(`/api/v1/seller/products/${id}`);
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

export function useAdjustStock(productId: string) {
  const invalidate = useInvalidateSellerProducts();
  return useMutation({
    mutationFn: async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
      const result = await api.patch<{ product: Product }>(`/api/v1/seller/products/${productId}/stock`, {
        variantId,
        quantity,
      });
      return result.data.product;
    },
    onSuccess: invalidate,
  });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Signed direct upload to Cloudinary. Supports product-specific folder `Haat/<productId>/<sequence>`. */
export async function uploadProductImage(file: File, productId?: string): Promise<{ url: string; publicId: string }> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error('Use a JPG, PNG or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  const signatureResult = await api.post<{ upload: UploadSignature; maxImageBytes: number }>(
    '/api/v1/seller/uploads/signature',
    productId ? { productId } : {},
  );
  const upload = signatureResult.data.upload;

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', upload.apiKey);
  form.append('timestamp', String(upload.timestamp));
  form.append('folder', upload.folder);
  if (upload.publicId) form.append('public_id', upload.publicId);
  form.append('signature', upload.signature);

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
