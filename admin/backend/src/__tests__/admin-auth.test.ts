import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminLoginSchema } from '../modules/auth/validators/auth.validator';
import { catalogListQuerySchema, moderateProductSchema } from '../modules/catalog/validators/catalog.validator';
import {
  sellerListQuerySchema,
  approveSellerSchema,
  rejectSellerSchema,
  blockSellerSchema,
} from '../modules/sellers/validators/seller.validator';
import { auditListQuerySchema } from '../modules/audit/validators/audit.validator';

describe('Admin Authentication Validators', () => {
  it('validates a correct admin login input with email', () => {
    const input = { identifier: 'admin@haat.com', password: 'admin@123456' };
    const parsed = adminLoginSchema.safeParse(input);
    assert.equal(parsed.success, true);
  });

  it('validates a correct admin login input with 10-digit phone number', () => {
    const input = { identifier: '9000000001', password: 'admin@123456' };
    const parsed = adminLoginSchema.safeParse(input);
    assert.equal(parsed.success, true);
  });

  it('rejects short passwords and missing identifiers', () => {
    const invalid = { identifier: '', password: '123' };
    const parsed = adminLoginSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
  });
});

describe('Admin Seller Approval & Action Validators', () => {
  it('accepts approval with optional notes', () => {
    const parsed = approveSellerSchema.safeParse({ notes: 'Application verified with proprietor' });
    assert.equal(parsed.success, true);
  });

  it('accepts rejection with an audit reason', () => {
    const parsed = rejectSellerSchema.safeParse({
      reason: 'GSTIN credentials do not match business registration address',
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.reason, 'GSTIN credentials do not match business registration address');
    }
  });

  it('rejects short rejection reason', () => {
    const parsed = rejectSellerSchema.safeParse({ reason: 'bad' });
    assert.equal(parsed.success, false);
  });

  it('accepts blocking with reason', () => {
    const parsed = blockSellerSchema.safeParse({ reason: 'Policy violation on dispatch counterfeit goods' });
    assert.equal(parsed.success, true);
  });

  it('parses seller list query with pagination defaults', () => {
    const parsed = sellerListQuerySchema.safeParse({});
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.page, 1);
      assert.equal(parsed.data.limit, 20);
    }
  });
});

describe('Admin Catalogue Moderation Validators', () => {
  it('accepts a valid product suspension with reason', () => {
    const parsed = moderateProductSchema.safeParse({
      isApproved: false,
      reason: 'Prohibited listing violation: hazardous industrial material without documentation',
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.isApproved, false);
    }
  });

  it('accepts a product reinstatement', () => {
    const parsed = moderateProductSchema.safeParse({
      isApproved: true,
      reason: 'Seller submitted updated verified test certificates',
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.isApproved, true);
    }
  });

  it('rejects an empty moderation reason', () => {
    const parsed = moderateProductSchema.safeParse({
      isApproved: false,
      reason: '',
    });
    assert.equal(parsed.success, false);
  });

  it('parses catalog filter query status', () => {
    const parsed = catalogListQuerySchema.safeParse({ status: 'SUSPENDED', page: 2 });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.status, 'SUSPENDED');
      assert.equal(parsed.data.page, 2);
    }
  });
});

describe('Admin Audit Log Query Validators', () => {
  it('parses valid audit query filters', () => {
    const parsed = auditListQuerySchema.safeParse({
      entityType: 'SellerProfile',
      action: 'SELLER_APPROVED',
      page: 1,
      limit: 50,
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.entityType, 'SellerProfile');
      assert.equal(parsed.data.action, 'SELLER_APPROVED');
      assert.equal(parsed.data.limit, 50);
    }
  });

  it('caps max limit at 100', () => {
    const parsed = auditListQuerySchema.safeParse({ limit: 500 });
    assert.equal(parsed.success, false);
  });
});
