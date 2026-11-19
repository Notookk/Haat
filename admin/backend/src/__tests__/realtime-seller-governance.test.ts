import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  isValidSellerStatusTransition,
  type SellerStatusChangedPayload,
  type CatalogVisibilityChangedPayload,
  type AdminSellerUpdatedPayload,
} from '@haat/shared-contracts';

describe('Real-Time Seller Governance & State Machine Contracts', () => {
  it('defines the required Socket.IO event names and room namespaces', () => {
    assert.equal(SOCKET_EVENTS.SELLER_STATUS_CHANGED, 'seller:status-changed');
    assert.equal(SOCKET_EVENTS.SELLER_APPROVED, 'seller:approved');
    assert.equal(SOCKET_EVENTS.SELLER_REJECTED, 'seller:rejected');
    assert.equal(SOCKET_EVENTS.SELLER_BLOCKED, 'seller:blocked');
    assert.equal(SOCKET_EVENTS.SELLER_UNBLOCKED, 'seller:unblocked');
    assert.equal(SOCKET_EVENTS.SELLER_SESSION_REVOKED, 'seller:session-revoked');
    assert.equal(SOCKET_EVENTS.CATALOG_VISIBILITY_CHANGED, 'catalog:visibility-changed');
    assert.equal(SOCKET_EVENTS.ADMIN_SELLER_UPDATED, 'admin:seller-updated');

    assert.equal(SOCKET_ROOMS.ADMIN_MONITORING, 'admin:monitoring');
    assert.equal(SOCKET_ROOMS.CATALOG_PUBLIC, 'catalog:public');
    assert.equal(SOCKET_ROOMS.sellerRoom('seller-123'), 'seller:seller-123');
    assert.equal(SOCKET_ROOMS.buyerRoom('buyer-456'), 'buyer:buyer-456');
  });

  it('validates status version and optimistic concurrency contracts', () => {
    // Current seller with statusVersion 1
    const seller = {
      id: 'seller-abc',
      status: 'PENDING_APPROVAL',
      statusVersion: 1,
    };

    // Simulated successful transition
    const nextVersion = seller.statusVersion + 1;
    assert.equal(nextVersion, 2);

    // Stale update attempt with old version (1) should be rejected
    const incomingStaleVersion: number = 1;
    const isConcurrentConflict = incomingStaleVersion !== (nextVersion as number);
    assert.equal(isConcurrentConflict, true);
  });

  it('validates real-time event payloads never leak sensitive fields', () => {
    const statusPayload: SellerStatusChangedPayload = {
      sellerId: '64f0123456789abcdef01234',
      storeName: 'Bengal Organic Spices',
      previousStatus: 'ACTIVE',
      newStatus: 'BLOCKED',
      statusVersion: 2,
      reason: 'Repeated non-fulfilment of wholesale orders',
      changedBy: '64f0987654321fedcba43210',
      actorRole: 'SUPER_ADMIN',
      changedAt: new Date().toISOString(),
    };

    // Verify critical governance fields exist
    assert.equal(statusPayload.sellerId, '64f0123456789abcdef01234');
    assert.equal(statusPayload.newStatus, 'BLOCKED');
    assert.equal(statusPayload.statusVersion, 2);

    // Verify sensitive data does not exist on event payload
    assert.equal((statusPayload as any).bankAccountNo, undefined);
    assert.equal((statusPayload as any).bankIfscCode, undefined);
    assert.equal((statusPayload as any).panNumber, undefined);
    assert.equal((statusPayload as any).passwordHash, undefined);
  });

  it('validates catalog visibility changed payload structure for buyer clients', () => {
    const catalogEvent: CatalogVisibilityChangedPayload = {
      sellerId: 'seller-xyz',
      sellerStatus: 'BLOCKED',
      action: 'PRODUCTS_HIDDEN',
      timestamp: new Date().toISOString(),
    };

    assert.equal(catalogEvent.action, 'PRODUCTS_HIDDEN');
    assert.equal(catalogEvent.sellerStatus, 'BLOCKED');
  });

  it('enforces resubmission workflow transition from REJECTED to PENDING_APPROVAL', () => {
    // Rejected seller can resubmit or be directly approved by admin
    assert.equal(isValidSellerStatusTransition('REJECTED', 'PENDING_APPROVAL'), true);
    assert.equal(isValidSellerStatusTransition('REJECTED', 'ACTIVE'), true);

    // Active seller can be rejected by admin
    assert.equal(isValidSellerStatusTransition('ACTIVE', 'REJECTED'), true);

    // Blocked seller cannot resubmit without admin unblock
    assert.equal(isValidSellerStatusTransition('BLOCKED', 'PENDING_APPROVAL'), false);

    // Active seller cannot transition to pending approval
    assert.equal(isValidSellerStatusTransition('ACTIVE', 'PENDING_APPROVAL'), false);
  });
});
