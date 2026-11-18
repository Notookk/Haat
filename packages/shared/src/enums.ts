/**
 * Canonical enumerations shared by API and web.
 * These are the single source of truth; Mongoose models mirror them as `enum` validators.
 */

export const USER_ROLES = ['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles a self-service registration may request. ADMIN is provisioned by seed only. */
export const SELF_SIGNUP_ROLES = ['BUYER', 'SELLER'] as const;
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const ORDER_PAYMENT_STATUSES = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUNDED',
] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const FULFILMENT_STATUSES = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'DISPUTED',
] as const;
export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number];

export const RFQ_STATUSES = [
  'SUBMITTED',
  'IN_REVIEW',
  'QUOTED',
  'REJECTED_BY_SELLER',
  'EXPIRED',
] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

export const QUOTATION_STATUSES = [
  'DRAFT',
  'ISSUED',
  'ACCEPTED',
  'REVISION_REQUESTED',
  'REJECTED_BY_BUYER',
  'EXPIRED',
  'CONVERTED_TO_ORDER',
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const CONVERSATION_TYPES = [
  'DIRECT',
  'PRODUCT_INQUIRY',
  'ORDER_SUPPORT',
  'RFQ_NEGOTIATION',
] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const KYC_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];
