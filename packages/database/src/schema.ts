import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// AGENTS TABLE
// ============================================

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  status: text('status', {
    enum: ['idle', 'working', 'waiting', 'offline']
  }).default('idle').notNull(),

  // Stats
  totalTasks: integer('total_tasks').default(0).notNull(),
  completedTasks: integer('completed_tasks').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),

  // Config
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  maxConcurrentTasks: integer('max_concurrent_tasks').default(3).notNull(),

  // OpenClaw
  openclawAgentId: text('openclaw_agent_id').notNull(),

  lastActiveAt: integer('last_active_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// TASKS TABLE
// ============================================

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['inbox', 'assigned', 'in_progress', 'review', 'blocked', 'done', 'cancelled']
  }).default('inbox').notNull(),
  priority: text('priority', {
    enum: ['low', 'normal', 'high', 'urgent']
  }).default('normal').notNull(),
  columnOrder: integer('column_order').default(0).notNull(),

  // Assignment
  assignedAgentId: text('assigned_agent_id').references(() => agents.id),
  assignedAt: integer('assigned_at', { mode: 'timestamp_ms' }),

  // OpenClaw Integration
  openclawRunId: text('openclaw_run_id'),
  openclawSessionKey: text('openclaw_session_key'),

  // Timing
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),

  // Source
  sourceChannel: text('source_channel', {
    enum: ['ui', 'telegram', 'discord', 'slack', 'api']
  }).default('ui').notNull(),

  // Results
  outcome: text('outcome', { enum: ['success', 'failed', 'cancelled'] }),
  output: text('output'),
  tokensUsed: integer('tokens_used').default(0).notNull(),
});

// ============================================
// TASK BLOCKS (Human-in-the-Loop)
// ============================================

export const taskBlocks = sqliteTable('task_blocks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),

  reason: text('reason').notNull(),
  question: text('question'),

  // Resolution
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  response: text('response'),
  approved: integer('approved', { mode: 'boolean' }),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// TASK COMMENTS
// ============================================

export const taskComments = sqliteTable('task_comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),

  content: text('content').notNull(),
  isFromAgent: integer('is_from_agent', { mode: 'boolean' }).default(false).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// ACTIVITY LOG
// ============================================

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),

  action: text('action', {
    enum: [
      'task_created', 'task_assigned', 'task_started', 'task_completed',
      'task_failed', 'task_blocked', 'task_unblocked', 'task_cancelled',
      'comment_added', 'agent_spawned', 'status_changed'
    ]
  }).notNull(),
  details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// LIVE OUTPUT BUFFER
// ============================================

export const outputBuffers = sqliteTable('output_buffers', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull(),

  content: text('content').default('').notNull(),
  lastSeq: integer('last_seq').default(0).notNull(),

  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// RELATIONS
// ============================================

export const agentsRelations = relations(agents, ({ many }) => ({
  tasks: many(tasks),
  activities: many(activities),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  agent: one(agents, {
    fields: [tasks.assignedAgentId],
    references: [agents.id],
  }),
  blocks: many(taskBlocks),
  comments: many(taskComments),
  activities: many(activities),
  outputBuffer: one(outputBuffers),
}));

export const taskBlocksRelations = relations(taskBlocks, ({ one }) => ({
  task: one(tasks, {
    fields: [taskBlocks.taskId],
    references: [tasks.id],
  }),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  task: one(tasks, {
    fields: [activities.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [activities.agentId],
    references: [agents.id],
  }),
}));

export const outputBuffersRelations = relations(outputBuffers, ({ one }) => ({
  task: one(tasks, {
    fields: [outputBuffers.taskId],
    references: [tasks.id],
  }),
}));
