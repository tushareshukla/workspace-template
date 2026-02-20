/**
 * Logger module using Pino
 * High-performance, structured logging for production
 */
import pino, { Logger, LoggerOptions, Level } from 'pino';

// Environment configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = (process.env.LOG_LEVEL as Level) || (isDevelopment ? 'debug' : 'info');

// Base configuration
const baseConfig: LoggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: process.env.SERVICE_NAME || 'workspace-api',
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      '*.password',
      '*.secret',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
};

// Development configuration with pretty printing
const devConfig: LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  },
};

// Production configuration with JSON output
const prodConfig: LoggerOptions = {
  ...baseConfig,
  // JSON output for log aggregators
};

// Create the base logger
export const logger: Logger = pino(isDevelopment ? devConfig : prodConfig);

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return logger.child({
    requestId,
    ...(userId && { userId }),
  });
}

/**
 * Logger for specific components
 */
export const loggers = {
  http: createLogger({ component: 'http' }),
  websocket: createLogger({ component: 'websocket' }),
  database: createLogger({ component: 'database' }),
  openclaw: createLogger({ component: 'openclaw' }),
  task: createLogger({ component: 'task' }),
  agent: createLogger({ component: 'agent' }),
};

/**
 * Structured error logging helper
 */
export function logError(
  log: Logger,
  error: Error | unknown,
  message: string,
  context?: Record<string, unknown>
): void {
  if (error instanceof Error) {
    log.error(
      {
        err: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
        ...context,
      },
      message
    );
  } else {
    log.error({ err: error, ...context }, message);
  }
}

/**
 * Performance timing helper
 */
export function createTimer(log: Logger, operation: string): () => void {
  const start = process.hrtime.bigint();

  return () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    log.debug(
      {
        operation,
        durationMs: durationMs.toFixed(2),
      },
      `${operation} completed in ${durationMs.toFixed(2)}ms`
    );
  };
}

/**
 * Audit logging for sensitive operations
 */
export function auditLog(
  action: string,
  userId: string | null,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
): void {
  logger.info(
    {
      audit: true,
      action,
      userId,
      resourceType,
      resourceId,
      ...details,
    },
    `Audit: ${action} on ${resourceType}:${resourceId}`
  );
}

// Export Pino types for consumers
export type { Logger, Level };
export default logger;
