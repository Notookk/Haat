import { describe, it, expect } from 'vitest';
import { sellerOnboardingSchema } from '../schemas/seller';

describe('sellerOnboardingSchema', () => {
  it('validates relaxed GSTIN, PAN, and IFSC formats', () => {
    const input = {
      storeName: 'Test Store',
      storeAddress: '123 Test Street, Kolkata',
      description: 'A great local test store',
      gstin: 'ABCDEF123456789',
      panNumber: 'ABCD123456',
      bankAccountName: 'Test Seller',
      bankAccountNo: '1234567890',
      bankIfscCode: 'SBI1234567890',
      servicePincodes: ['700001'],
    };

    const result = sellerOnboardingSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstin).toBe('ABCDEF123456789');
      expect(result.data.panNumber).toBe('ABCD123456');
      expect(result.data.bankIfscCode).toBe('SBI1234567890');
    }
  });

  it('rejects invalid lengths', () => {
    const input = {
      storeName: 'Test Store',
      storeAddress: '123 Test Street, Kolkata',
      gstin: 'SHORT',
      panNumber: 'SHORT',
      bankAccountName: 'Test Seller',
      bankAccountNo: '123',
      bankIfscCode: 'SHORT',
      servicePincodes: ['700001'],
    };

    const result = sellerOnboardingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
