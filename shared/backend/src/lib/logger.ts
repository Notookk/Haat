type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: LogLevel = process.env.LOG_LEVEL === 'debug' ? 'debug' : 'info';

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Structured JSON logger (PRD §7.4). Never pass secrets or raw request bodies. */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
