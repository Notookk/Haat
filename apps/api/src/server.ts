import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './lib/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info('api listening', { port: env.PORT, env: env.NODE_ENV, apiUrl: env.API_URL });
  });

  const shutdown = (signal: string) => {
    logger.info('shutdown requested', { signal });
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    // Do not hang forever on open keep-alives.
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
