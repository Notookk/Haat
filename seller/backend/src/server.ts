// HAAT Platform - Seller API Server
import { createServer } from 'node:http';
import {
  connectDatabase,
  disconnectDatabase,
  env,
  logger,
  createSocketServer,
  realtimeEventBus,
} from '@haat/shared-backend';
import { createSellerApp } from './app';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createSellerApp();
  const server = createServer(app);

  const port = env.SELLER_BACKEND_PORT || 7100;

  // Initialize Socket.IO server & platform event bus
  const io = createSocketServer(server, { serviceName: 'seller-backend' });
  realtimeEventBus.init({ io, currentPort: port });

  server.listen(port, () => {
    logger.info('seller api listening', {
      port,
      env: env.NODE_ENV,
      apiUrl: env.SELLER_API_URL || `http://localhost:${port}`,
    });
  });

  const shutdown = (signal: string) => {
    logger.info('seller shutdown requested', { signal });
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
  logger.error('seller_bootstrap_failed', { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
