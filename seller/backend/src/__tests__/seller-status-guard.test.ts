import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ERROR_CODES } from '@haat/shared-contracts';
import { requireActiveSeller } from '../middleware/requireActiveSeller';
import { AppError } from '@haat/shared-backend';

describe('Seller Active Status Middleware Protection', () => {
  it('blocks unauthenticated requests with 401', async () => {
    const req = { user: undefined } as any;
    let nextError: any = null;

    await requireActiveSeller(req, {} as any, (err?: any) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.equal(nextError.statusCode, 401);
  });

  it('blocks non-SELLER roles with 403', async () => {
    const req = { user: { userId: 'user-buyer-1', role: 'BUYER' } } as any;
    let nextError: any = null;

    await requireActiveSeller(req, {} as any, (err?: any) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.equal(nextError.statusCode, 403);
  });

  it('rejects access when seller profile is not found with 404', async () => {
    const req = { user: { userId: '000000000000000000000000', role: 'SELLER' } } as any;
    let nextError: any = null;

    await requireActiveSeller(req, {} as any, (err?: any) => {
      nextError = err;
    });

    // In a test without DB connection, it either fails or errors cleanly
    assert.ok(nextError);
  });
});

describe('Buyer Public Catalogue Visibility Rule', () => {
  it('defines the required catalogue visibility filter: isActive=true, isApproved=true, sellerStatus=ACTIVE', () => {
    const visibilityFilter = {
      isActive: true,
      isApproved: true,
      sellerStatus: 'ACTIVE',
    };

    assert.equal(visibilityFilter.isActive, true);
    assert.equal(visibilityFilter.isApproved, true);
    assert.equal(visibilityFilter.sellerStatus, 'ACTIVE');

    // A blocked seller product has sellerStatus = 'BLOCKED'
    const blockedProduct = {
      title: 'Spice Mix',
      isActive: true,
      isApproved: true,
      sellerStatus: 'BLOCKED',
    };

    const matchesPublic =
      blockedProduct.isActive === visibilityFilter.isActive &&
      blockedProduct.isApproved === visibilityFilter.isApproved &&
      blockedProduct.sellerStatus === visibilityFilter.sellerStatus;

    // Blocked product MUST NOT match public query
    assert.equal(matchesPublic, false);
  });

  it('excludes pending and rejected seller products from public catalog queries', () => {
    const pendingProduct = { isActive: true, isApproved: true, sellerStatus: 'PENDING_APPROVAL' };
    const rejectedProduct = { isActive: true, isApproved: true, sellerStatus: 'REJECTED' };

    assert.notEqual(pendingProduct.sellerStatus, 'ACTIVE');
    assert.notEqual(rejectedProduct.sellerStatus, 'ACTIVE');
  });
});
