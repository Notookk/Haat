import type { SellerStatus } from './enums';

export const SOCKET_EVENTS = {
  APPLICATION_CREATED: 'seller:application-created',
  SELLER_STATUS_CHANGED: 'seller:status-changed',
  SELLER_APPROVED: 'seller:approved',
  SELLER_REJECTED: 'seller:rejected',
  SELLER_BLOCKED: 'seller:blocked',
  SELLER_UNBLOCKED: 'seller:unblocked',
  SELLER_SESSION_REVOKED: 'seller:session-revoked',
  CATALOG_VISIBILITY_CHANGED: 'catalog:visibility-changed',
  ADMIN_SELLER_UPDATED: 'admin:seller-updated',
  ORDER_CREATED: 'order:created',
  ORDER_STATUS_CHANGED: 'order:status-changed',
  DELIVERY_SLOT_CAPACITY_UPDATED: 'delivery-slot:capacity-updated',
  PRODUCT_CREATED: 'catalog:product-created',
  PRODUCT_UPDATED: 'catalog:product-updated',
  PRODUCT_DELETED: 'catalog:product-deleted',
  CATEGORY_CREATED: 'catalog:category-created',
  CATEGORY_UPDATED: 'catalog:category-updated',
  CATEGORY_DELETED: 'catalog:category-deleted',
  STORE_UPDATED: 'store:updated',
  BUYER_REGISTERED: 'buyer:registered',
  BUYER_UPDATED: 'buyer:updated',
  CHAT_MESSAGE: 'chat:message',
  CHAT_BLOCKED: 'chat:blocked',
  CHAT_UNBLOCKED: 'chat:unblocked',
  CHAT_DELETED: 'chat:deleted',
  CHAT_MESSAGES_DELETED: 'chat:messages_deleted',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export const SOCKET_ROOMS = {
  ADMIN_MONITORING: 'admin:monitoring',
  CATALOG_PUBLIC: 'catalog:public',
  sellerRoom: (sellerId: string) => `seller:${sellerId}`,
  buyerRoom: (buyerId: string) => `buyer:${buyerId}`,
} as const;

export interface SellerStatusChangedPayload {
  sellerId: string;
  userId?: string;
  storeName: string;
  previousStatus: SellerStatus;
  newStatus: SellerStatus;
  statusVersion: number;
  reason?: string;
  changedBy: string;
  actorRole: string;
  changedAt: string;
}

export interface CatalogVisibilityChangedPayload {
  sellerId: string;
  sellerStatus: SellerStatus;
  action: 'PRODUCTS_SHOWN' | 'PRODUCTS_HIDDEN';
  timestamp: string;
}

export interface AdminSellerUpdatedPayload {
  sellerId: string;
  storeName: string;
  status: SellerStatus;
  statusVersion: number;
  isVerified: boolean;
  action: 'APPLICATION_CREATED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'UNBLOCKED' | 'RESUBMITTED';
  actorId: string;
  reason?: string;
  timestamp: string;
}

export interface ProductChangedPayload {
  productId: string;
  sellerId: string;
  categoryId?: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  title?: string;
  slug?: string;
  timestamp: string;
}

export interface CategoryChangedPayload {
  categoryId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  name?: string;
  slug?: string;
  timestamp: string;
}

export interface StoreUpdatedPayload {
  sellerId: string;
  storeName: string;
  storeSlug: string;
  timestamp: string;
}

export interface BuyerRegisteredPayload {
  buyerId: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: string;
  createdAt: string;
  action: 'REGISTERED';
}

export interface BuyerUpdatedPayload {
  buyerId: string;
  isActive?: boolean;
  fullName?: string;
  updatedAt: string;
}

export interface ChatBlockedPayload {
  sellerSlug: string;
  buyerId?: string | null;
  buyerName?: string | null;
  blockedBy: 'BUYER' | 'SELLER';
  reason?: string | null;
  timestamp: string;
}

export interface ChatUnblockedPayload {
  sellerSlug: string;
  buyerId?: string | null;
  buyerName?: string | null;
  timestamp: string;
}

export interface ChatDeletedPayload {
  sellerSlug?: string;
  buyerId?: string | null;
  buyerName?: string | null;
  deletedConversations?: Array<{ sellerSlug: string; buyerId?: string | null }>;
  timestamp: string;
}

export interface ChatMessagesDeletedPayload {
  messageIds: string[];
  sellerSlug?: string;
  buyerId?: string | null;
  buyerName?: string | null;
  timestamp: string;
}

