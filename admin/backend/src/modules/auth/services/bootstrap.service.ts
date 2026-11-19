import { env, hashPassword, verifyPassword, logger, User } from '@haat/shared-backend';

/**
 * Dynamic Admin Bootstrap Service.
 *
 * Rules:
 * 1. Reads ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD dynamically from environment.
 * 2. Ensures the admin user exists in MongoDB with role 'ADMIN'.
 * 3. Hashes password using bcrypt with configured cost (>= 12).
 * 4. Automatically syncs MongoDB credentials if environment credentials change.
 */
export async function bootstrapAdminUser(): Promise<{ created: boolean; email: string }> {
  const email = (env.ADMIN_BOOTSTRAP_EMAIL || 'admin@haat.com').trim().toLowerCase();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD || 'admin@123456';
  const bootstrapPhone = '9000000001';

  // Dynamic check: find admin by email, by admin role, or by bootstrap phone
  const existing = await User.findOne({
    $or: [{ email }, { role: 'ADMIN' }, { role: 'SUPER_ADMIN' }, { phoneNumber: bootstrapPhone }],
  }).select('+passwordHash');

  if (existing) {
    existing.email = email;
    existing.role = 'ADMIN';
    existing.isActive = true;

    const isPasswordValid = await verifyPassword(password, existing.passwordHash);
    let passwordUpdated = false;

    if (!isPasswordValid) {
      existing.passwordHash = await hashPassword(password);
      passwordUpdated = true;
    }

    await existing.save();

    logger.info('admin_bootstrap_synced', {
      email,
      userId: String(existing._id),
      role: existing.role,
      passwordUpdated,
      message: 'Admin account dynamically verified and synced in MongoDB.',
    });

    return { created: passwordUpdated, email };
  }

  const passwordHash = await hashPassword(password);

  const newAdmin = await User.create({
    fullName: 'HAAT Admin',
    email,
    phoneNumber: bootstrapPhone,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });

  logger.info('admin_bootstrap_created', {
    email,
    userId: String(newAdmin._id),
    role: newAdmin.role,
    message: 'Admin account created in MongoDB with dynamic role ADMIN.',
  });

  return { created: true, email };
}
