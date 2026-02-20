export interface OpenClawConfig {
  gatewayUrl: string;
  wsUrl: string;
  timeout?: number;
}

export type OpenClawRPCMethod =
  | 'agent'
  | 'sessions.list'
  | 'sessions.preview'
  | 'sessions.patch'
  | 'sessions.delete'
  | 'chat.history'
  | 'agents.list'
  | 'usage.status'
  | 'usage.cost'
  | 'health'
  | 'models.list';

export interface OpenClawRPCResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AgentRunParams {
  message: string;
  sessionKey?: string;
  channel?: string;
  to?: string;
  accountId?: string;
  threadId?: string;
  deliver?: boolean;
  lane?: string;
  extraSystemPrompt?: string;
  thinking?: string;
  timeout?: number;
  label?: string;
  spawnedBy?: string;
}

export interface AgentRunResult {
  runId: string;
  sessionKey: string;
  status: 'accepted' | 'queued';
}

export interface SessionInfo {
  sessionId: string;
  sessionKey: string;
  channel?: string;
  model?: string;
  modelProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  updatedAt: number;
  spawnedBy?: string;
  spawnDepth?: number;
}

export interface SubagentRun {
  runId: string;
  task: string;
  label?: string;
  childSessionKey: string;
  requesterSessionKey: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  outcome?: {
    status: 'completed' | 'failed' | 'timeout';
    result?: string;
    error?: string;
  };
  model?: string;
}

export interface OpenClawEvent {
  type: 'agent' | 'chat' | 'session' | 'heartbeat';
  payload: unknown;
  seq?: number;
  ts: number;
}

export interface AgentEventPayload {
  runId: string;
  sessionKey?: string;
  stream: 'lifecycle' | 'tool' | 'assistant' | 'error';
  seq: number;
  ts: number;
  data: Record<string, unknown>;
}

export interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  seq: number;
  state: 'delta' | 'final' | 'error';
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
  };
}
