import { EventEmitter } from 'events';
import type { Database } from '@workspace/database';
import { tasks, agents, activities, outputBuffers } from '@workspace/database';
import type { OpenClawClient } from '@workspace/openclaw-client';
import type { Task, Agent, Activity, WSMessage } from '@workspace/types';
import { eq } from 'drizzle-orm';
import { ids } from '@workspace/utils/id';
import { loggers, logError } from '../lib/logger';

/**
 * OpenClawBridge synchronizes events from OpenClaw to our database
 * and emits events for WebSocket broadcast to dashboard clients
 */
export class OpenClawBridge extends EventEmitter {
  private outputAccumulators: Map<string, string> = new Map();

  constructor(
    private openclawClient: OpenClawClient,
    private db: Database
  ) {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const events = this.openclawClient.events;

    // Connection events
    events.on('connected', () => {
      loggers.openclaw.info('OpenClaw connected');
      this.emit('openclaw:connected');
    });

    events.on('disconnected', (reason) => {
      loggers.openclaw.warn({ reason }, 'OpenClaw disconnected');
      this.emit('openclaw:disconnected', reason);
    });

    // Lifecycle events
    events.on('lifecycle:start', (runId, sessionKey, data) => {
      this.handleLifecycleStart(runId, sessionKey, data);
    });

    events.on('lifecycle:end', (runId, sessionKey, data) => {
      this.handleLifecycleEnd(runId, sessionKey, data);
    });

    events.on('lifecycle:error', (runId, sessionKey, error) => {
      this.handleLifecycleError(runId, sessionKey, error);
    });

    // Tool calls
    events.on('tool:call', (runId, toolName, args) => {
      this.handleToolCall(runId, toolName, args);
    });

    // Assistant output
    events.on('assistant:delta', (runId, text) => {
      this.handleAssistantDelta(runId, text);
    });

    events.on('assistant:final', (runId, text) => {
      this.handleAssistantFinal(runId, text);
    });
  }

  private async handleLifecycleStart(
    runId: string,
    sessionKey: string,
    data: Record<string, unknown>
  ) {
    // Find task linked to this run
    const task = await this.findTaskByRunId(runId);
    if (!task) return;

    // Update task status
    await this.db
      .update(tasks)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    // Update agent status
    if (task.assignedAgentId) {
      await this.db
        .update(agents)
        .set({
          status: 'working',
          lastActiveAt: new Date(),
        })
        .where(eq(agents.id, task.assignedAgentId));
    }

    // Create activity
    await this.createActivity(task.id, task.assignedAgentId, 'task_started', { runId });

    // Initialize output buffer
    await this.db.insert(outputBuffers).values({
      id: ids.run(),
      taskId: task.id,
      runId,
      content: '',
      lastSeq: 0,
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Emit for WebSocket
    this.emitTaskUpdate(task.id, { status: 'in_progress', startedAt: new Date() });
    if (task.assignedAgentId) {
      this.emitAgentUpdate(task.assignedAgentId, { status: 'working' });
    }
  }

  private async handleLifecycleEnd(
    runId: string,
    sessionKey: string,
    data: Record<string, unknown>
  ) {
    const task = await this.findTaskByRunId(runId);
    if (!task) return;

    const output = this.outputAccumulators.get(runId) || '';
    this.outputAccumulators.delete(runId);

    // Update task
    await this.db
      .update(tasks)
      .set({
        status: 'done',
        outcome: 'success',
        output,
        completedAt: new Date(),
        tokensUsed: (data.tokens as number) || 0,
      })
      .where(eq(tasks.id, task.id));

    // Update agent
    if (task.assignedAgentId) {
      const agent = await this.db.query.agents.findFirst({
        where: eq(agents.id, task.assignedAgentId),
      });

      if (agent) {
        await this.db
          .update(agents)
          .set({
            status: 'idle',
            completedTasks: agent.completedTasks + 1,
            totalTokens: agent.totalTokens + ((data.tokens as number) || 0),
            lastActiveAt: new Date(),
          })
          .where(eq(agents.id, task.assignedAgentId));
      }
    }

    // Create activity
    await this.createActivity(task.id, task.assignedAgentId, 'task_completed', {
      runId,
      outcome: 'success',
    });

    // Emit for WebSocket
    this.emitTaskUpdate(task.id, {
      status: 'done',
      outcome: 'success',
      output,
      completedAt: new Date(),
    });

    if (task.assignedAgentId) {
      this.emitAgentUpdate(task.assignedAgentId, { status: 'idle' });
    }
  }

  private async handleLifecycleError(
    runId: string,
    sessionKey: string,
    error: string
  ) {
    const task = await this.findTaskByRunId(runId);
    if (!task) return;

    // Update task
    await this.db
      .update(tasks)
      .set({
        status: 'blocked',
        outcome: 'failed',
        output: error,
      })
      .where(eq(tasks.id, task.id));

    // Update agent
    if (task.assignedAgentId) {
      await this.db
        .update(agents)
        .set({ status: 'idle' })
        .where(eq(agents.id, task.assignedAgentId));
    }

    // Create activity
    await this.createActivity(task.id, task.assignedAgentId, 'task_failed', {
      runId,
      error,
    });

    // Emit for WebSocket
    this.emitTaskUpdate(task.id, { status: 'blocked', outcome: 'failed' });
    if (task.assignedAgentId) {
      this.emitAgentUpdate(task.assignedAgentId, { status: 'idle' });
    }
  }

  private async handleToolCall(
    runId: string,
    toolName: string,
    args: unknown
  ) {
    const task = await this.findTaskByRunId(runId);
    if (!task) return;

    // Create activity for tool call
    await this.createActivity(task.id, task.assignedAgentId, 'status_changed', {
      type: 'tool_call',
      toolName,
      runId,
    });

    // Emit for WebSocket
    this.emit('ws:broadcast', {
      type: 'activity',
      data: {
        taskId: task.id,
        action: 'tool_call',
        details: { toolName },
      },
      timestamp: Date.now(),
    } as WSMessage);
  }

  private async handleAssistantDelta(runId: string, text: string) {
    // Accumulate output
    const current = this.outputAccumulators.get(runId) || '';
    const updated = current + text;
    this.outputAccumulators.set(runId, updated);

    const task = await this.findTaskByRunId(runId);
    if (!task) return;

    // Update buffer in database (throttled)
    await this.db
      .update(outputBuffers)
      .set({
        content: updated,
        updatedAt: new Date(),
      })
      .where(eq(outputBuffers.runId, runId));

    // Emit delta for WebSocket
    this.emit('ws:broadcast', {
      type: 'output_delta',
      data: {
        taskId: task.id,
        runId,
        delta: text,
        fullOutput: updated,
      },
      timestamp: Date.now(),
    } as WSMessage);
  }

  private async handleAssistantFinal(runId: string, text: string) {
    // Final output is handled in lifecycle:end
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async findTaskByRunId(runId: string) {
    return this.db.query.tasks.findFirst({
      where: eq(tasks.openclawRunId, runId),
    });
  }

  private async createActivity(
    taskId: string | null,
    agentId: string | null,
    action: string,
    details: Record<string, unknown>
  ) {
    await this.db.insert(activities).values({
      id: ids.activity(),
      taskId,
      agentId,
      action: action as any,
      details,
      createdAt: new Date(),
    });

    loggers.openclaw.debug({ taskId, agentId, action }, 'Activity created');
  }

  private emitTaskUpdate(taskId: string, changes: Partial<Task>) {
    this.emit('ws:broadcast', {
      type: 'task_update',
      data: { taskId, changes },
      timestamp: Date.now(),
    } as WSMessage);
  }

  private emitAgentUpdate(agentId: string, changes: Partial<Agent>) {
    this.emit('ws:broadcast', {
      type: 'agent_update',
      data: { agentId, changes },
      timestamp: Date.now(),
    } as WSMessage);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getOutputBuffer(runId: string): string {
    return this.outputAccumulators.get(runId) || '';
  }
}
