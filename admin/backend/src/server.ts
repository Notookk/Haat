// HAAT Platform - Admin API Server
import { createServer } from 'node:http';
import {
  connectDatabase,
  disconnectDatabase,
  env,
  logger,
  createSocketServer,
  realtimeEventBus,
} from '@haat/shared-backend';
import { createAdminApp } from './app';
import { bootstrapAdminUser } from './modules/auth/services/bootstrap.service';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Guarantee bootstrap admin exists and credentials match environment configuration
  try {
    const adminResult = await bootstrapAdminUser();
    logger.info('admin_bootstrap_ready', { email: adminResult.email, created: adminResult.created });
  } catch (error) {
    logger.error('admin_bootstrap_error', { message: error instanceof Error ? error.message : String(error) });
  }

  const app = createAdminApp();
  const server = createServer(app);

  const port = env.ADMIN_BACKEND_PORT || 6000;

  // Initialize Socket.IO server & platform event bus
  const io = createSocketServer(server, { serviceName: 'admin-backend' });
  realtimeEventBus.init({ io, currentPort: port });

  server.listen(port, () => {
    logger.info('admin api listening', {
      port,
      env: env.NODE_ENV,
      apiUrl: env.ADMIN_API_URL || `http://localhost:${port}`,
    });
  });

  const shutdown = (signal: string) => {
    logger.info('admin shutdown requested', { signal });
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('unhandled_rejection', { reason: String(reason) }));
  process.on('uncaughtException', (error) => {
    logger.error('uncaught_exception', { message: error.message, stack: error.stack });
    shutdown('uncaughtException');
  });
}

void bootstrap().catch((error: unknown) => {
  logger.error('admin_bootstrap_failed', { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
