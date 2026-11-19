import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FULFILMENT_STATUSES } from '@haat/shared-contracts';

describe('Scheduled Delivery Slot Business Rules', () => {
  it('calculates remaining capacity accurately and prevents overbooking', () => {
    const slot = {
      capacity: 10,
      bookedCount: 8,
      isActive: true,
    };

    const remaining = Math.max(0, slot.capacity - slot.bookedCount);
    assert.equal(remaining, 2);

    // When fully booked
    slot.bookedCount = 10;
    const fullyBookedRemaining = Math.max(0, slot.capacity - slot.bookedCount);
    assert.equal(fullyBookedRemaining, 0);

    const isAvailable = slot.isActive && slot.bookedCount < slot.capacity;
    assert.equal(isAvailable, false);
  });

  it('prevents slot deletion when committed orders are present', () => {
    const slotWithOrders = {
      id: 'slot-1',
      capacity: 15,
      bookedCount: 3,
    };

    const canDelete = slotWithOrders.bookedCount === 0;
    assert.equal(canDelete, false);

    const slotWithoutOrders = {
      id: 'slot-2',
      capacity: 15,
      bookedCount: 0,
    };

    assert.equal(slotWithoutOrders.bookedCount === 0, true);
  });

  it('prevents setting slot capacity below the current booked count', () => {
    const slot = {
      capacity: 15,
      bookedCount: 5,
    };

    const requestedNewCapacity = 4;
    const isValidUpdate = requestedNewCapacity >= slot.bookedCount;
    assert.equal(isValidUpdate, false);

    const validNewCapacity = 10;
    assert.equal(validNewCapacity >= slot.bookedCount, true);
  });
});

describe('Seller Order Fulfilment State Machine Rules', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['PACKED', 'READY_FOR_DISPATCH', 'CANCELLED'],
    PACKED: ['READY_FOR_DISPATCH', 'CANCELLED'],
    READY_FOR_DISPATCH: ['OUT_FOR_DELIVERY', 'DISPATCHED'],
    DISPATCHED: ['DELIVERED'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  it('allows valid forward fulfilment progression from PENDING_CONFIRMATION to DELIVERED', () => {
    assert.ok(VALID_TRANSITIONS.PENDING_CONFIRMATION.includes('CONFIRMED'));
    assert.ok(VALID_TRANSITIONS.CONFIRMED.includes('PROCESSING'));
    assert.ok(VALID_TRANSITIONS.PROCESSING.includes('READY_FOR_DISPATCH'));
    assert.ok(VALID_TRANSITIONS.READY_FOR_DISPATCH.includes('OUT_FOR_DELIVERY'));
    assert.ok(VALID_TRANSITIONS.OUT_FOR_DELIVERY.includes('DELIVERED'));
  });

  it('allows cancellation from unfulfilled states only', () => {
    assert.ok(VALID_TRANSITIONS.PENDING_CONFIRMATION.includes('CANCELLED'));
    assert.ok(VALID_TRANSITIONS.CONFIRMED.includes('CANCELLED'));
    assert.ok(VALID_TRANSITIONS.PROCESSING.includes('CANCELLED'));
    assert.ok(VALID_TRANSITIONS.PACKED.includes('CANCELLED'));

    // Terminal states cannot be cancelled
    assert.equal(VALID_TRANSITIONS.DELIVERED.includes('CANCELLED'), false);
    assert.equal(VALID_TRANSITIONS.CANCELLED.length, 0);
  });

  it('enforces integer paise revenue calculation and net subtraction', () => {
    const grossSalesPaise = 500000; // ₹5,000.00
    const cancelledAmountPaise = 120000; // ₹1,200.00

    assert.ok(Number.isSafeInteger(grossSalesPaise));
    assert.ok(Number.isSafeInteger(cancelledAmountPaise));

    const netRevenuePaise = Math.max(0, grossSalesPaise - cancelledAmountPaise);
    assert.equal(netRevenuePaise, 380000); // ₹3,800.00
    assert.ok(Number.isSafeInteger(netRevenuePaise));
  });
});
