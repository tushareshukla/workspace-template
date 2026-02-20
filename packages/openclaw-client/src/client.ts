import WebSocket from 'ws';
import { OpenClawEventEmitter } from './events';
import type {
  OpenClawConfig,
  OpenClawRPCMethod,
  OpenClawRPCResponse,
  AgentRunParams,
  AgentRunResult,
  SessionInfo,
  SubagentRun,
  OpenClawEvent,
} from './types';

export class OpenClawClient {
  private config: OpenClawConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;

  public events: OpenClawEventEmitter;

  constructor(config: OpenClawConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    this.events = new OpenClawEventEmitter();
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.on('open', () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.events.emit('connected');

          // Subscribe to events
          this.ws?.send(JSON.stringify({
            type: 'subscribe',
            events: ['agent', 'chat', 'session', 'heartbeat']
          }));

          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString()) as OpenClawEvent;
            this.events.processRawEvent(event);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        });

        this.ws.on('close', (code, reason) => {
          this.isConnecting = false;
          this.events.emit('disconnected', reason.toString() || `Code: ${code}`);
          this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
          this.isConnecting = false;
          this.events.emit('error', err);
          if (this.reconnectAttempts === 0) {
            reject(err);
          }
        });
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((err) => {
        console.error('Reconnection failed:', err);
      });
    }, delay);
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ============================================
  // RPC METHODS
  // ============================================

  private async rpc<T>(
    method: OpenClawRPCMethod,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(`${this.config.gatewayUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, params }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    const result = (await response.json()) as OpenClawRPCResponse<T>;

    if (!result.ok) {
      throw new Error(result.error?.message || 'RPC call failed');
    }

    return result.data as T;
  }

  // ============================================
  // AGENT OPERATIONS
  // ============================================

  async runAgent(params: AgentRunParams): Promise<AgentRunResult> {
    return this.rpc<AgentRunResult>('agent', params);
  }

  async spawnSubagent(
    task: string,
    options: {
      parentSessionKey?: string;
      label?: string;
      model?: string;
      timeout?: number;
    } = {}
  ): Promise<AgentRunResult> {
    return this.runAgent({
      message: `[Task Assignment]\n\n${task}`,
      sessionKey: options.parentSessionKey,
      deliver: false,
      lane: 'subagent',
      label: options.label,
      timeout: options.timeout,
    });
  }

  // ============================================
  // SESSION OPERATIONS
  // ============================================

  async listSessions(): Promise<SessionInfo[]> {
    const result = await this.rpc<{ sessions: SessionInfo[] }>('sessions.list');
    return result.sessions;
  }

  async getSessionPreview(sessionKey: string): Promise<SessionInfo & { messages: unknown[] }> {
    return this.rpc('sessions.preview', { key: sessionKey });
  }

  async patchSession(
    sessionKey: string,
    updates: Partial<SessionInfo>
  ): Promise<void> {
    await this.rpc('sessions.patch', { key: sessionKey, ...updates });
  }

  async deleteSession(sessionKey: string): Promise<void> {
    await this.rpc('sessions.delete', { key: sessionKey });
  }

  // ============================================
  // CHAT HISTORY
  // ============================================

  async getChatHistory(
    sessionKey: string,
    options: { skip?: number; limit?: number } = {}
  ): Promise<{ messages: unknown[]; total: number }> {
    return this.rpc('chat.history', {
      key: sessionKey,
      skip: options.skip || 0,
      limit: options.limit || 50,
    });
  }

  // ============================================
  // AGENTS
  // ============================================

  async listAgents(): Promise<unknown[]> {
    const result = await this.rpc<{ agents: unknown[] }>('agents.list');
    return result.agents;
  }

  // ============================================
  // USAGE & HEALTH
  // ============================================

  async getUsageStatus(): Promise<unknown> {
    return this.rpc('usage.status');
  }

  async getUsageCost(startDate: string, endDate: string): Promise<unknown> {
    return this.rpc('usage.cost', { startDate, endDate });
  }

  async getHealth(): Promise<{ status: string; uptime: number }> {
    return this.rpc('health');
  }

  async listModels(): Promise<unknown[]> {
    const result = await this.rpc<{ models: unknown[] }>('models.list');
    return result.models;
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  async waitForRunCompletion(
    runId: string,
    timeout: number = 300000
  ): Promise<{ status: 'completed' | 'failed' | 'timeout'; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({ status: 'timeout' });
      }, timeout);

      const handleEnd = (
        eventRunId: string,
        _sessionKey: string,
        data: Record<string, unknown>
      ) => {
        if (eventRunId === runId) {
          cleanup();
          resolve({
            status: 'completed',
            output: data.result as string,
          });
        }
      };

      const handleError = (eventRunId: string, _sessionKey: string, error: string) => {
        if (eventRunId === runId) {
          cleanup();
          resolve({
            status: 'failed',
            error,
          });
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.events.off('lifecycle:end', handleEnd);
        this.events.off('lifecycle:error', handleError);
      };

      this.events.on('lifecycle:end', handleEnd);
      this.events.on('lifecycle:error', handleError);
    });
  }
}

// Factory function
export function createOpenClawClient(config: OpenClawConfig): OpenClawClient {
  return new OpenClawClient(config);
}
