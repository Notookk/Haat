import { createServer } from 'node:http';
import {
  connectDatabase,
  disconnectDatabase,
  env,
  logger,
  createSocketServer,
  realtimeEventBus,
} from '@haat/shared-backend';
import { createBuyerApp } from './app';
import { registerChatSocketHandlers } from './modules/chat/socket/chat.socket';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createBuyerApp();
  const server = createServer(app);

  const port = env.BUYER_BACKEND_PORT || env.PORT || 4000;

  // Initialize Socket.IO server & platform event bus
  const io = createSocketServer(server, { serviceName: 'buyer-backend' });
  realtimeEventBus.init({ io, currentPort: port });

  // Register real-time chat socket listeners
  registerChatSocketHandlers(io);

  server.listen(port, () => {
    logger.info('buyer api listening', {
      port,
      env: env.NODE_ENV,
      apiUrl: env.BUYER_API_URL || env.API_URL || `http://localhost:${port}`,
    });
  });

  const shutdown = (signal: string) => {
    logger.info('shutdown requested', { signal });
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
  logger.error('bootstrap_failed', { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
