/**
 * HTTP request logging middleware using Pino
 */
import type { Request, Response, NextFunction } from 'express';
import { loggers, createRequestLogger, Logger } from '../lib/logger';
import { generateId } from '@workspace/utils/id';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      log: Logger;
      requestId: string;
    }
  }
}

/**
 * Main request logging middleware
 * Attaches a request-scoped logger and logs request/response
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const requestId = (req.headers['x-request-id'] as string) || generateId(12);

  // Attach logger and request ID to request object
  req.requestId = requestId;
  req.log = createRequestLogger(requestId);

  // Set request ID in response header for client correlation
  res.setHeader('x-request-id', requestId);

  // Skip logging for health checks
  const isHealthCheck = req.path === '/health' || req.path === '/api/health';

  res.on('finish', () => {
    if (isHealthCheck) return;

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2),
      contentLength: res.get('content-length'),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    };

    const message = `${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(0)}ms`;

    if (res.statusCode >= 500) {
      loggers.http.error(logData, message);
    } else if (res.statusCode >= 400) {
      loggers.http.warn(logData, message);
    } else {
      loggers.http.info(logData, message);
    }
  });

  next();
}

/**
 * Error logging middleware
 * Should be used after routes to catch and log errors
 */
export function errorLogger(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const log = req.log || loggers.http;

  log.error(
    {
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
      },
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    },
    `Request error: ${err.message}`
  );

  next(err);
}
