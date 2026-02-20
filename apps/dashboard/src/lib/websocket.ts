import { create } from 'zustand';
import type { WSMessage, Task, Agent, Activity } from '@workspace/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';

interface WebSocketStore {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribe: (taskId: string) => void;
  unsubscribe: (taskId: string) => void;

  // Event handlers (to be set by components)
  onTaskUpdate: ((taskId: string, changes: Partial<Task>) => void) | null;
  onAgentUpdate: ((agentId: string, changes: Partial<Agent>) => void) | null;
  onActivity: ((activity: Activity) => void) | null;
  onOutputDelta: ((taskId: string, delta: string, fullOutput: string) => void) | null;

  setOnTaskUpdate: (handler: (taskId: string, changes: Partial<Task>) => void) => void;
  setOnAgentUpdate: (handler: (agentId: string, changes: Partial<Agent>) => void) => void;
  setOnActivity: (handler: (activity: Activity) => void) => void;
  setOnOutputDelta: (handler: (taskId: string, delta: string, fullOutput: string) => void) => void;
}

export const useWebSocket = create<WebSocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,

  onTaskUpdate: null,
  onAgentUpdate: null,
  onActivity: null,
  onOutputDelta: null,

  connect: () => {
    const { socket, reconnectAttempts } = get();

    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      set({ isConnected: true, reconnectAttempts: 0 });
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message, get());
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ isConnected: false, socket: null });

      // Reconnect with exponential backoff
      const attempts = get().reconnectAttempts;
      if (attempts < 10) {
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        setTimeout(() => {
          set({ reconnectAttempts: attempts + 1 });
          get().connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    set({ socket: ws });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  subscribe: (taskId: string) => {
    const { socket } = get();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe:task', taskId }));
    }
  },

  unsubscribe: (taskId: string) => {
    const { socket } = get();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe:task', taskId }));
    }
  },

  setOnTaskUpdate: (handler) => set({ onTaskUpdate: handler }),
  setOnAgentUpdate: (handler) => set({ onAgentUpdate: handler }),
  setOnActivity: (handler) => set({ onActivity: handler }),
  setOnOutputDelta: (handler) => set({ onOutputDelta: handler }),
}));

function handleMessage(message: WSMessage, store: WebSocketStore) {
  switch (message.type) {
    case 'task_update':
      const taskData = message.data as { taskId: string; changes: Partial<Task> };
      store.onTaskUpdate?.(taskData.taskId, taskData.changes);
      break;

    case 'agent_update':
      const agentData = message.data as { agentId: string; changes: Partial<Agent> };
      store.onAgentUpdate?.(agentData.agentId, agentData.changes);
      break;

    case 'activity':
      store.onActivity?.(message.data as Activity);
      break;

    case 'output_delta':
      const outputData = message.data as { taskId: string; delta: string; fullOutput: string };
      store.onOutputDelta?.(outputData.taskId, outputData.delta, outputData.fullOutput);
      break;
  }
}
