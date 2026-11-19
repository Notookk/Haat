import { connectDatabase, disconnectDatabase, logger } from '@haat/shared-backend';
import { bootstrapAdminUser } from '../modules/auth/services/bootstrap.service';

async function main(): Promise<void> {
  await connectDatabase();
  const result = await bootstrapAdminUser();
  if (result.created) {
    logger.info(`Admin bootstrap successfully created account: ${result.email}`);
  } else {
    logger.info(`Admin account already exists or preserved: ${result.email}`);
  }
  await disconnectDatabase();
}

void main().catch(async (error: unknown) => {
  logger.error('admin_seed_failed', { message: error instanceof Error ? error.message : String(error) });
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
