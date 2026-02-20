import { Router } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { eq, desc, and, inArray, like } from 'drizzle-orm';
import type { Database } from '@workspace/database';
import { tasks, agents, activities, taskBlocks, taskComments } from '@workspace/database';
import type { OpenClawClient } from '@workspace/openclaw-client';
import type { OpenClawBridge } from '../services/openclaw-bridge';
import { AppError } from '../middleware/error-handler';
import type { TaskStatus, TaskPriority } from '@workspace/types';
import { ids } from '@workspace/utils/id';
import { loggers, logError } from '../lib/logger';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignAgentId: z.string().ids.activity().optional(),
  sourceChannel: z.enum(['ui', 'telegram', 'discord', 'slack', 'api']).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['inbox', 'assigned', 'in_progress', 'review', 'blocked', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  columnOrder: z.number().int().optional(),
});

const assignTaskSchema = z.object({
  agentId: z.string(),
});

const resolveBlockSchema = z.object({
  response: z.string(),
  approved: z.boolean(),
});

const addCommentSchema = z.object({
  content: z.string().min(1),
});

export function createTaskRoutes(
  db: Database,
  openclawClient: OpenClawClient,
  bridge: OpenClawBridge
): Router {
  const router = Router();

  // ============================================
  // GET /api/tasks - List tasks with filters
  // ============================================
  router.get('/', async (req, res, next) => {
    try {
      const {
        status,
        agentId,
        priority,
        search,
        page = '1',
        pageSize = '50',
      } = req.query;

      let query = db.select().from(tasks);

      // Apply filters
      const conditions = [];

      if (status) {
        const statuses = (status as string).split(',') as TaskStatus[];
        conditions.push(inArray(tasks.status, statuses));
      }

      if (agentId) {
        conditions.push(eq(tasks.assignedAgentId, agentId as string));
      }

      if (priority) {
        conditions.push(eq(tasks.priority, priority as TaskPriority));
      }

      if (search) {
        conditions.push(like(tasks.title, `%${search}%`));
      }

      const result = await db
        .select()
        .from(tasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tasks.createdAt))
        .limit(parseInt(pageSize as string))
        .offset((parseInt(page as string) - 1) * parseInt(pageSize as string));

      // Get total count
      const countResult = await db
        .select()
        .from(tasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        success: true,
        data: {
          items: result,
          total: countResult.length,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // GET /api/tasks/:id - Get single task
  // ============================================
  router.get('/:id', async (req, res, next) => {
    try {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, req.params.id),
        with: {
          agent: true,
          blocks: {
            orderBy: (blocks, { desc }) => [desc(blocks.createdAt)],
          },
          comments: {
            orderBy: (comments, { desc }) => [desc(comments.createdAt)],
          },
          activities: {
            orderBy: (activities, { desc }) => [desc(activities.createdAt)],
            limit: 20,
          },
        },
      });

      if (!task) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
      }

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // POST /api/tasks - Create new task
  // ============================================
  router.post('/', async (req, res, next) => {
    try {
      const body = createTaskSchema.parse(req.body);
      const taskId = ids.task();

      const newTask = {
        id: taskId,
        title: body.title,
        description: body.description || null,
        priority: body.priority || 'normal',
        sourceChannel: body.sourceChannel || 'ui',
        status: 'inbox' as const,
        createdAt: new Date(),
      };

      await db.insert(tasks).values(newTask);

      // Create activity
      await db.insert(activities).values({
        id: ids.activity(),
        taskId,
        action: 'task_created',
        details: { title: body.title },
        createdAt: new Date(),
      });

      // If agent specified, assign immediately
      if (body.assignAgentId) {
        await assignTaskToAgent(db, openclawClient, taskId, body.assignAgentId);
      }

      // Broadcast via WebSocket
      bridge.emit('ws:broadcast', {
        type: 'task_update',
        data: { taskId, changes: newTask },
        timestamp: Date.now(),
      });

      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });

      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // PATCH /api/tasks/:id - Update task
  // ============================================
  router.patch('/:id', async (req, res, next) => {
    try {
      const body = updateTaskSchema.parse(req.body);

      const existing = await db.query.tasks.findFirst({
        where: eq(tasks.id, req.params.id),
      });

      if (!existing) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
      }

      await db.update(tasks).set(body).where(eq(tasks.id, req.params.id));

      // Create activity for status change
      if (body.status && body.status !== existing.status) {
        await db.insert(activities).values({
          id: ids.activity(),
          taskId: req.params.id,
          action: 'status_changed',
          details: { from: existing.status, to: body.status },
          createdAt: new Date(),
        });
      }

      // Broadcast
      bridge.emit('ws:broadcast', {
        type: 'task_update',
        data: { taskId: req.params.id, changes: body },
        timestamp: Date.now(),
      });

      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, req.params.id),
      });

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // POST /api/tasks/:id/assign - Assign to agent
  // ============================================
  router.post('/:id/assign', async (req, res, next) => {
    try {
      const body = assignTaskSchema.parse(req.body);

      await assignTaskToAgent(db, openclawClient, req.params.id, body.agentId);

      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, req.params.id),
        with: { agent: true },
      });

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // POST /api/tasks/:id/block - Block task (human input needed)
  // ============================================
  router.post('/:id/block', async (req, res, next) => {
    try {
      const { reason, question } = req.body;

      await db.update(tasks).set({ status: 'blocked' }).where(eq(tasks.id, req.params.id));

      const blockId = ids.block();
      await db.insert(taskBlocks).values({
        id: blockId,
        taskId: req.params.id,
        reason,
        question,
        createdAt: new Date(),
      });

      await db.insert(activities).values({
        id: ids.activity(),
        taskId: req.params.id,
        action: 'task_blocked',
        details: { reason, question },
        createdAt: new Date(),
      });

      bridge.emit('ws:broadcast', {
        type: 'block_request',
        data: { taskId: req.params.id, blockId, reason, question },
        timestamp: Date.now(),
      });

      res.json({ success: true, data: { blockId } });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // POST /api/tasks/:id/unblock - Resolve block
  // ============================================
  router.post('/:id/unblock', async (req, res, next) => {
    try {
      const body = resolveBlockSchema.parse(req.body);

      // Find active block
      const block = await db.query.taskBlocks.findFirst({
        where: and(
          eq(taskBlocks.taskId, req.params.id),
          eq(taskBlocks.resolvedAt, null as any)
        ),
        orderBy: (blocks, { desc }) => [desc(blocks.createdAt)],
      });

      if (!block) {
        throw new AppError(404, 'NO_ACTIVE_BLOCK', 'No active block found');
      }

      // Resolve block
      await db
        .update(taskBlocks)
        .set({
          resolvedAt: new Date(),
          response: body.response,
          approved: body.approved,
        })
        .where(eq(taskBlocks.id, block.id));

      // Update task status
      await db
        .update(tasks)
        .set({ status: 'in_progress' })
        .where(eq(tasks.id, req.params.id));

      // Get task to find OpenClaw session
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, req.params.id),
      });

      // Send response to OpenClaw agent
      if (task?.openclawSessionKey && openclawClient.isConnected) {
        await openclawClient.runAgent({
          message: `[Human Response]\n\nApproved: ${body.approved}\nResponse: ${body.response}`,
          sessionKey: task.openclawSessionKey,
          deliver: false,
        });
      }

      await db.insert(activities).values({
        id: ids.activity(),
        taskId: req.params.id,
        action: 'task_unblocked',
        details: { response: body.response, approved: body.approved },
        createdAt: new Date(),
      });

      bridge.emit('ws:broadcast', {
        type: 'task_update',
        data: { taskId: req.params.id, changes: { status: 'in_progress' } },
        timestamp: Date.now(),
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // POST /api/tasks/:id/comments - Add comment
  // ============================================
  router.post('/:id/comments', async (req, res, next) => {
    try {
      const body = addCommentSchema.parse(req.body);

      const commentId = ids.comment();
      await db.insert(taskComments).values({
        id: commentId,
        taskId: req.params.id,
        content: body.content,
        isFromAgent: false,
        createdAt: new Date(),
      });

      await db.insert(activities).values({
        id: ids.activity(),
        taskId: req.params.id,
        action: 'comment_added',
        details: { commentId },
        createdAt: new Date(),
      });

      const comment = await db.query.taskComments.findFirst({
        where: eq(taskComments.id, commentId),
      });

      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // GET /api/tasks/:id/output - Get live output
  // ============================================
  router.get('/:id/output', async (req, res, next) => {
    try {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, req.params.id),
      });

      if (!task) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
      }

      // Get from buffer if task is running
      let output = task.output || '';
      if (task.openclawRunId && task.status === 'in_progress') {
        output = bridge.getOutputBuffer(task.openclawRunId) || output;
      }

      res.json({ success: true, data: { output } });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // DELETE /api/tasks/:id - Delete task
  // ============================================
  router.delete('/:id', async (req, res, next) => {
    try {
      await db.delete(tasks).where(eq(tasks.id, req.params.id));
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// ============================================
// HELPER: Assign task to agent
// ============================================
async function assignTaskToAgent(
  db: Database,
  openclawClient: OpenClawClient,
  taskId: string,
  agentId: string
) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) {
    throw new AppError(404, 'AGENT_NOT_FOUND', 'Agent not found');
  }

  // Call OpenClaw to run agent
  let runId: string | undefined;
  let sessionKey: string | undefined;

  if (openclawClient.isConnected) {
    try {
      const result = await openclawClient.runAgent({
        message: `[Task Assignment]\n\nTask: ${task.title}\n\nDescription: ${task.description || 'No description provided'}`,
        sessionKey: `agent:${agent.openclawAgentId}:task:${taskId}`,
        deliver: false,
        lane: 'subagent',
        label: task.title.slice(0, 50),
      });

      runId = result.runId;
      sessionKey = result.sessionKey;
    } catch (err) {
      logError(loggers.agent, err, 'Failed to run agent', { taskId, agentId });
    }
  }

  // Update task
  await db
    .update(tasks)
    .set({
      status: 'assigned',
      assignedAgentId: agentId,
      assignedAt: new Date(),
      openclawRunId: runId,
      openclawSessionKey: sessionKey,
    })
    .where(eq(tasks.id, taskId));

  // Update agent stats
  await db
    .update(agents)
    .set({
      totalTasks: agent.totalTasks + 1,
      status: 'working',
      lastActiveAt: new Date(),
    })
    .where(eq(agents.id, agentId));

  // Create activity
  await db.insert(activities).values({
    id: ids.activity(),
    taskId,
    agentId,
    action: 'task_assigned',
    details: { agentName: agent.name, runId },
    createdAt: new Date(),
  });
}
