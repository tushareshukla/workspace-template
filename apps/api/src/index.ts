import 'dotenv/config';
import { createServer } from './server';
import { createDatabase } from '@workspace/database';
import { createOpenClawClient } from '@workspace/openclaw-client';
import { OpenClawBridge } from './services/openclaw-bridge';
import logger, { loggers, logError } from './lib/logger';

const PORT = parseInt(process.env.PORT || '4000', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '4001', 10);
const DATABASE_PATH = process.env.DATABASE_PATH || './data/workspace.db';

async function main() {
  logger.info('Starting Workspace API...');

  // Initialize database
  loggers.database.info({ path: DATABASE_PATH }, 'Initializing database');
  const db = createDatabase(DATABASE_PATH);

  // Initialize OpenClaw client
  loggers.openclaw.info('Connecting to OpenClaw...');
  const openclawClient = createOpenClawClient({
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3000',
    wsUrl: process.env.OPENCLAW_WS_URL || 'ws://localhost:3000/ws',
  });

  // Create OpenClaw bridge (handles event synchronization)
  const bridge = new OpenClawBridge(openclawClient, db);

  // Try to connect to OpenClaw (non-blocking)
  openclawClient.connect().catch((err: Error) => {
    loggers.openclaw.warn({ error: err.message }, 'Failed to connect to OpenClaw (will retry)');
  });

  // Create and start server
  const { app, wss, broadcast } = createServer(db, openclawClient, bridge);

  // Start HTTP server
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, `API server running on http://localhost:${PORT}`);
  });

  // Attach WebSocket server
  wss.attach(server, WS_PORT);
  loggers.websocket.info({ port: WS_PORT }, `WebSocket server running on ws://localhost:${WS_PORT}`);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    openclawClient.disconnect();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logError(logger, err, 'Failed to start server');
  process.exit(1);
});
