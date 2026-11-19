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
