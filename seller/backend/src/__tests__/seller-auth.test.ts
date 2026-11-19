import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sellerLoginSchema, sellerRegisterSchema } from '../modules/auth/validators/auth.validator';
import { updateStoreProfileSchema } from '../modules/profile/validators/profile.validator';

describe('Seller Auth Validators', () => {
  it('validates a valid seller login with email', () => {
    const parsed = sellerLoginSchema.safeParse({
      identifier: 'seller@haat.com',
      password: 'seller@123456',
    });
    assert.equal(parsed.success, true);
  });

  it('validates a valid seller login with 10-digit phone number', () => {
    const parsed = sellerLoginSchema.safeParse({
      identifier: '9876543210',
      password: 'seller@123456',
    });
    assert.equal(parsed.success, true);
  });

  it('rejects short passwords and missing identifiers', () => {
    const parsed = sellerLoginSchema.safeParse({
      identifier: '',
      password: '123',
    });
    assert.equal(parsed.success, false);
  });

  it('validates seller registration data', () => {
    const parsed = sellerRegisterSchema.safeParse({
      fullName: 'New Merchant',
      phoneNumber: '9876543210',
      email: 'merchant@haat.com',
      password: 'password123',
    });
    assert.equal(parsed.success, true);
  });

  it('rejects registration with missing or invalid email', () => {
    const missing = sellerRegisterSchema.safeParse({
      fullName: 'New Merchant',
      phoneNumber: '9876543210',
      password: 'password123',
    });
    assert.equal(missing.success, false);

    const empty = sellerRegisterSchema.safeParse({
      fullName: 'New Merchant',
      phoneNumber: '9876543210',
      email: '',
      password: 'password123',
    });
    assert.equal(empty.success, false);

    const invalid = sellerRegisterSchema.safeParse({
      fullName: 'New Merchant',
      phoneNumber: '9876543210',
      email: 'not-an-email',
      password: 'password123',
    });
    assert.equal(invalid.success, false);
  });
});

describe('Seller Store Profile Validators', () => {
  it('validates store profile update input with IFSC code and pincodes', () => {
    const parsed = updateStoreProfileSchema.safeParse({
      storeName: 'Royal Spices & Dry Fruits',
      bankAccountName: 'Royal Spices Enterprise',
      bankAccountNo: '123456789012',
      bankIfscCode: 'HDFC0001234',
      servicePincodes: ['110001', '110002'],
    });
    assert.equal(parsed.success, true);
  });

  it('rejects invalid IFSC codes', () => {
    const parsed = updateStoreProfileSchema.safeParse({
      bankIfscCode: 'INVALID_IFSC',
    });
    assert.equal(parsed.success, false);
  });
});
