import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import type { Database } from '@workspace/database';
import type { OpenClawClient } from '@workspace/openclaw-client';
import type { OpenClawBridge } from './services/openclaw-bridge';

import { createTaskRoutes } from './routes/tasks';
import { createAgentRoutes } from './routes/agents';
import { createDashboardRoutes } from './routes/dashboard';
import { createWebSocketServer } from './websocket';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

export function createServer(
  db: Database,
  openclawClient: OpenClawClient,
  bridge: OpenClawBridge
) {
  const app: Express = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(requestLogger);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      openclawConnected: openclawClient.isConnected,
    });
  });

  // API Routes
  app.use('/api/tasks', createTaskRoutes(db, openclawClient, bridge));
  app.use('/api/agents', createAgentRoutes(db));
  app.use('/api/dashboard', createDashboardRoutes(db));

  // Error handler
  app.use(errorHandler);

  // WebSocket server
  const { wss, broadcast } = createWebSocketServer(bridge);

  return { app, wss, broadcast };
}
