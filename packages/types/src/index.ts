// ============================================
// CORE DOMAIN TYPES
// ============================================

// Task Status for Kanban
export type TaskStatus =
  | 'inbox'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'blocked'
  | 'done'
  | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TaskSource = 'ui' | 'telegram' | 'discord' | 'slack' | 'api';

// ============================================
// TASK
// ============================================

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  columnOrder: number;

  // Assignment
  assignedAgentId: string | null;
  assignedAt: Date | null;

  // OpenClaw Integration
  openclawRunId: string | null;
  openclawSessionKey: string | null;

  // Timing
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;

  // Source
  sourceChannel: TaskSource;

  // Results
  outcome: 'success' | 'failed' | 'cancelled' | null;
  output: string | null;
  tokensUsed: number;

  // Relations (populated)
  agent?: Agent;
  blocks?: TaskBlock[];
  comments?: TaskComment[];
  activities?: Activity[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignAgentId?: string;
  sourceChannel?: TaskSource;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  columnOrder?: number;
}

// ============================================
// AGENT
// ============================================

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'offline';

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  status: AgentStatus;

  // Stats
  totalTasks: number;
  completedTasks: number;
  totalTokens: number;

  // Config
  isActive: boolean;
  maxConcurrentTasks: number;

  // OpenClaw
  openclawAgentId: string;

  lastActiveAt: Date | null;
  createdAt: Date;

  // Relations
  currentTasks?: Task[];
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  openclawAgentId: string;
  maxConcurrentTasks?: number;
}

// ============================================
// TASK BLOCK (Human-in-the-Loop)
// ============================================

export interface TaskBlock {
  id: string;
  taskId: string;

  reason: string;
  question: string | null;

  // Resolution
  resolvedAt: Date | null;
  response: string | null;
  approved: boolean | null;

  createdAt: Date;

  // Relations
  task?: Task;
}

export interface ResolveBlockInput {
  response: string;
  approved: boolean;
}

// ============================================
// COMMENTS
// ============================================

export interface TaskComment {
  id: string;
  taskId: string;

  content: string;
  isFromAgent: boolean;

  createdAt: Date;

  // Relations
  task?: Task;
}

export interface CreateCommentInput {
  content: string;
}

// ============================================
// ACTIVITY LOG
// ============================================

export type ActivityAction =
  | 'task_created'
  | 'task_assigned'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_blocked'
  | 'task_unblocked'
  | 'task_cancelled'
  | 'comment_added'
  | 'agent_spawned'
  | 'status_changed';

export interface Activity {
  id: string;
  taskId: string | null;
  agentId: string | null;

  action: ActivityAction;
  details: Record<string, unknown>;

  createdAt: Date;

  // Relations
  task?: Task;
  agent?: Agent;
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  blockedTasks: number;
  activeAgents: number;
  totalAgents: number;
  totalTokens: number;
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  kanban: KanbanColumn[];
  agents: Agent[];
  recentActivity: Activity[];
}

// ============================================
// OPENCLAW EVENTS
// ============================================

export type OpenClawEventType =
  | 'lifecycle'
  | 'tool'
  | 'assistant'
  | 'error';

export interface OpenClawEvent {
  runId: string;
  sessionKey: string;
  stream: OpenClawEventType;
  seq: number;
  ts: number;
  data: Record<string, unknown>;
}

export interface OpenClawLifecycleEvent extends OpenClawEvent {
  stream: 'lifecycle';
  data: {
    phase: 'start' | 'end' | 'error';
    startedAt?: number;
    endedAt?: number;
    outcome?: string;
    error?: string;
  };
}

export interface OpenClawToolEvent extends OpenClawEvent {
  stream: 'tool';
  data: {
    toolName: string;
    args?: Record<string, unknown>;
    result?: unknown;
  };
}

export interface OpenClawAssistantEvent extends OpenClawEvent {
  stream: 'assistant';
  data: {
    text: string;
  };
}

// ============================================
// WEBSOCKET MESSAGES
// ============================================

export type WSMessageType =
  | 'task_update'
  | 'agent_update'
  | 'activity'
  | 'output_delta'
  | 'block_request'
  | 'stats_update';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  data: T;
  timestamp: number;
}

export interface TaskUpdateMessage {
  taskId: string;
  changes: Partial<Task>;
}

export interface AgentUpdateMessage {
  agentId: string;
  changes: Partial<Agent>;
}

export interface OutputDeltaMessage {
  taskId: string;
  runId: string;
  delta: string;
  fullOutput: string;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// API REQUEST PARAMS
// ============================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface TaskFilters extends PaginationParams {
  status?: TaskStatus | TaskStatus[];
  agentId?: string;
  priority?: TaskPriority;
  search?: string;
}
