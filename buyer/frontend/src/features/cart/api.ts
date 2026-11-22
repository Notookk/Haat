import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@haat/shared-frontend';

export interface CartItem {
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  sku: string;
  image: string | null;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  moq: number;
  orderMultiple: number;
  stockAvailable: number;
  isWholesale: boolean;
}

export interface SellerCartGroup {
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  items: CartItem[];
  subtotalPaise: number;
}

export interface CartData {
  items: CartItem[];
  groups: SellerCartGroup[];
  totalAmountPaise: number;
  totalQuantity: number;
}

export const cartKeys = {
  all: ['cart'] as const,
};

export function useCart() {
  return useQuery({
    queryKey: cartKeys.all,
    queryFn: async () => {
      try {
        const res = await api.get<{ cart: CartData }>('/cart');
        return res.data.cart;
      } catch (err: any) {
        if (err?.statusCode === 401) {
          return { items: [], groups: [], totalAmountPaise: 0, totalQuantity: 0 };
        }
        throw err;
      }
    },
    staleTime: 30_000,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { productId: string; variantId?: string | null; quantity: number }) => {
      const res = await api.post<{ cart: CartData }>('/cart/items', payload);
      return res.data.cart;
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.all, newCart);
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      variantId,
    }: {
      productId: string;
      quantity: number;
      variantId?: string | null;
    }) => {
      const res = await api.patch<{ cart: CartData }>(`/cart/items/${productId}`, {
        quantity,
        variantId,
      });
      return res.data.cart;
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.all, newCart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, variantId }: { productId: string; variantId?: string | null }) => {
      const q = variantId ? `?variantId=${variantId}` : '';
      const res = await api.delete<{ cart: CartData }>(`/cart/items/${productId}${q}`);
      return res.data.cart;
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.all, newCart);
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<{ cart: CartData }>('/cart');
      return res.data.cart;
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.all, newCart);
    },
  });
}
