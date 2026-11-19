import { connectDatabase, disconnectDatabase, User, SellerProfile, DeliverySlot, hashPassword, logger } from '@haat/shared-backend';

async function seedSeller(): Promise<void> {
  await connectDatabase();

  const email = 'seller@haat.com';
  const phoneNumber = '9876543210';
  const password = 'seller@123456';

  let user = await User.findOne({ $or: [{ email }, { phoneNumber }] });

  if (!user) {
    const passwordHash = await hashPassword(password);
    user = await User.create({
      fullName: 'Bengal Spices Merchant',
      phoneNumber,
      email,
      passwordHash,
      role: 'SELLER',
      isPhoneVerified: true,
      isActive: true,
    });
    logger.info('Created seed seller user', { email, phoneNumber });
  }

  let seller = await SellerProfile.findOne({ userId: user._id });

  if (!seller) {
    seller = await SellerProfile.create({
      userId: user._id,
      storeName: 'Bengal Spices & Staples',
      storeSlug: 'bengal-spices',
      description:
        'Authentic regional whole spices, mustard oils, organic pulses, and wholesale staples direct from Bengal.',
      gstin: '19AAACB1234P1Z5',
      panNumber: 'AAACB1234P',
      bankAccountName: 'Bengal Spices Enterprise',
      bankAccountNo: '987654321098',
      bankIfscCode: 'SBIN0001234',
      servicePincodes: ['700001', '700002', '700019', '700020'],
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvalNotes: 'System seeded active merchant.',
      isVerified: true,
      isActive: true,
      onboardingCompletedAt: new Date(),
    });
    logger.info('Created seed seller profile', { storeSlug: seller.storeSlug });
  }

  // Seed sample upcoming delivery slots if none exist
  const slotCount = await DeliverySlot.countDocuments({ sellerId: seller._id });
  if (slotCount === 0) {
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      await DeliverySlot.create([
        { sellerId: seller._id, date: dateStr, startTime: '09:00', endTime: '12:00', capacity: 15, bookedCount: 0, isActive: true },
        { sellerId: seller._id, date: dateStr, startTime: '14:00', endTime: '18:00', capacity: 20, bookedCount: 0, isActive: true },
      ]);
    }
    logger.info('Created seed delivery slots for 7 days', { sellerId: seller._id });
  }

  await disconnectDatabase();
}

void seedSeller()
  .then(() => {
    logger.info('Seller seed completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Seller seed failed', { message: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });
