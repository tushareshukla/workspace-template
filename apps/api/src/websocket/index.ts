import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { OpenClawBridge } from '../services/openclaw-bridge';
import type { WSMessage } from '@workspace/types';

interface WSClient {
  ws: WebSocket;
  subscribedTasks: Set<string>;
  isAlive: boolean;
}

export function createWebSocketServer(bridge: OpenClawBridge) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, WSClient>();

  // Heartbeat to detect stale connections
  const heartbeatInterval = setInterval(() => {
    clients.forEach((client, ws) => {
      if (!client.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('connection', (ws: WebSocket) => {
    const client: WSClient = {
      ws,
      subscribedTasks: new Set(),
      isAlive: true,
    };
    clients.set(ws, client);

    console.log(`WebSocket client connected (total: ${clients.size})`);

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      const c = clients.get(ws);
      if (c) c.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(client, message);
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`WebSocket client disconnected (total: ${clients.size})`);
    });

    // Send welcome message
    send(ws, {
      type: 'stats_update',
      data: { connected: true },
      timestamp: Date.now(),
    });
  });

  // Handle client messages
  function handleClientMessage(client: WSClient, message: any) {
    switch (message.type) {
      case 'subscribe:task':
        client.subscribedTasks.add(message.taskId);
        break;

      case 'unsubscribe:task':
        client.subscribedTasks.delete(message.taskId);
        break;

      case 'ping':
        send(client.ws, { type: 'pong' as any, data: {}, timestamp: Date.now() });
        break;
    }
  }

  // Send message to single client
  function send(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Broadcast to all clients
  function broadcast(message: WSMessage) {
    clients.forEach((client) => {
      send(client.ws, message);
    });
  }

  // Broadcast to clients subscribed to a specific task
  function broadcastToTask(taskId: string, message: WSMessage) {
    clients.forEach((client) => {
      if (client.subscribedTasks.has(taskId)) {
        send(client.ws, message);
      }
    });
  }

  // Listen to bridge events
  bridge.on('ws:broadcast', (message: WSMessage) => {
    // For task-specific updates, also send to subscribed clients
    if (message.type === 'task_update' || message.type === 'output_delta') {
      const taskId = (message.data as any).taskId;
      if (taskId) {
        broadcastToTask(taskId, message);
      }
    }

    // Always broadcast to all for general updates
    broadcast(message);
  });

  // Cleanup on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return {
    wss: {
      attach: (server: Server, port: number) => {
        // For separate WS port
        const wsServer = new WebSocketServer({ port });

        wsServer.on('connection', (ws, req) => {
          wss.emit('connection', ws, req);
        });

        console.log(`WebSocket server attached on port ${port}`);
      },
    },
    broadcast,
    broadcastToTask,
    getClientCount: () => clients.size,
  };
}
