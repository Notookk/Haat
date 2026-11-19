import { useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  title: string;
  pricePaise: number;
  quantity: number;
  image?: string | null;
  sellerSlug?: string;
}

export interface ChatContext {
  sellerId?: string;
  sellerName?: string;
  sellerSlug?: string;
  productId?: string;
  productTitle?: string;
  productSku?: string;
  productImage?: string;
  productPricePaise?: number;
}

export interface ChatMessageItem {
  _id?: string;
  sellerSlug: string;
  sellerName: string;
  buyerName: string;
  buyerId?: string | null;
  sender: 'BUYER' | 'SELLER';
  text: string;
  productId?: string | null;
  productTitle?: string | null;
  productImage?: string | null;
  productPricePaise?: number | null;
  createdAt?: string;
}

const WISHLIST_KEY = 'haat_buyer_wishlist';
const CART_KEY = 'haat_buyer_cart';

// ---- WISHLIST HELPERS ----
export function getWishlistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isProductWishlisted(productId: string): boolean {
  return getWishlistIds().includes(productId);
}

export function toggleWishlistProduct(productId: string): boolean {
  const current = getWishlistIds();
  const exists = current.includes(productId);
  const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('haat_wishlist_updated', { detail: { count: next.length } }));
  } catch {
    // Ignore quota errors
  }
  return !exists;
}

export function clearWishlist(): void {
  try {
    localStorage.removeItem(WISHLIST_KEY);
    window.dispatchEvent(new CustomEvent('haat_wishlist_updated', { detail: { count: 0 } }));
  } catch {
    // Ignore quota errors
  }
}

export function useWishlistIds(): string[] {
  const [ids, setIds] = useState<string[]>(() => getWishlistIds());
  useEffect(() => {
    const handleUpdate = () => setIds(getWishlistIds());
    window.addEventListener('haat_wishlist_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('haat_wishlist_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  return ids;
}

export function useWishlistCount(): number {
  const [count, setCount] = useState(() => getWishlistIds().length);
  useEffect(() => {
    const handleUpdate = () => setCount(getWishlistIds().length);
    window.addEventListener('haat_wishlist_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('haat_wishlist_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  return count;
}

// ---- CART HELPERS ----
export function getCartItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isProductInCart(productId: string): boolean {
  return getCartItems().some((item) => item.productId === productId);
}

export function addProductToCart(item: CartItem): number {
  const current = getCartItems();
  const idx = current.findIndex((c) => c.productId === item.productId);
  let next: CartItem[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
  } else {
    next = [...current, item];
  }
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    const totalCount = next.reduce((acc, c) => acc + c.quantity, 0);
    window.dispatchEvent(new CustomEvent('haat_cart_updated', { detail: { count: totalCount } }));
    return totalCount;
  } catch {
    return current.length;
  }
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const current = getCartItems();
  let next: CartItem[];
  if (quantity <= 0) {
    next = current.filter((c) => c.productId !== productId);
  } else {
    next = current.map((c) => (c.productId === productId ? { ...c, quantity } : c));
  }
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    const totalCount = next.reduce((acc, c) => acc + c.quantity, 0);
    window.dispatchEvent(new CustomEvent('haat_cart_updated', { detail: { count: totalCount } }));
  } catch {
    // Ignore quota errors
  }
}

export function removeCartItem(productId: string): void {
  const current = getCartItems();
  const next = current.filter((c) => c.productId !== productId);
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    const totalCount = next.reduce((acc, c) => acc + c.quantity, 0);
    window.dispatchEvent(new CustomEvent('haat_cart_updated', { detail: { count: totalCount } }));
  } catch {
    // Ignore quota errors
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new CustomEvent('haat_cart_updated', { detail: { count: 0 } }));
  } catch {
    // Ignore quota errors
  }
}

export function useCartItems(): CartItem[] {
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  useEffect(() => {
    const handleUpdate = () => setItems(getCartItems());
    window.addEventListener('haat_cart_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('haat_cart_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  return items;
}

export function useCartCount(): number {
  const [count, setCount] = useState(() => {
    return getCartItems().reduce((acc, c) => acc + c.quantity, 0);
  });
  useEffect(() => {
    const handleUpdate = () => {
      setCount(getCartItems().reduce((acc, c) => acc + c.quantity, 0));
    };
    window.addEventListener('haat_cart_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('haat_cart_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  return count;
}

// ---- CHAT OPEN HELPER ----
export function openSellerChat(context: ChatContext) {
  window.dispatchEvent(new CustomEvent('haat_open_chat', { detail: context }));
}
