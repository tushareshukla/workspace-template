import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import type { Database } from '@workspace/database';
import { agents, tasks } from '@workspace/database';
import { AppError } from '../middleware/error-handler';
import { ids } from '@workspace/utils/id';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  openclawAgentId: z.string().min(1),
  maxConcurrentTasks: z.number().int().min(1).max(10).optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  maxConcurrentTasks: z.number().int().min(1).max(10).optional(),
});

export function createAgentRoutes(db: Database): Router {
  const router = Router();

  // ============================================
  // GET /api/agents - List all agents
  // ============================================
  router.get('/', async (req, res, next) => {
    try {
      const { includeInactive } = req.query;

      let result;
      if (includeInactive === 'true') {
        result = await db.select().from(agents).orderBy(desc(agents.lastActiveAt));
      } else {
        result = await db
          .select()
          .from(agents)
          .where(eq(agents.isActive, true))
          .orderBy(desc(agents.lastActiveAt));
      }

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // GET /api/agents/:id - Get single agent with stats
  // ============================================
  router.get('/:id', async (req, res, next) => {
    try {
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, req.params.id),
        with: {
          tasks: {
            where: (t, { ne }) => ne(t.status, 'done'),
            orderBy: (t, { desc }) => [desc(t.createdAt)],
            limit: 10,
          },
        },
      });

      if (!agent) {
        throw new AppError(404, 'AGENT_NOT_FOUND', 'Agent not found');
      }

      res.json({ success: true, data: agent });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // POST /api/agents - Create new agent
  // ============================================
  router.post('/', async (req, res, next) => {
    try {
      const body = createAgentSchema.parse(req.body);

      // Check if openclawAgentId already exists
      const existing = await db.query.agents.findFirst({
        where: eq(agents.openclawAgentId, body.openclawAgentId),
      });

      if (existing) {
        throw new AppError(409, 'AGENT_EXISTS', 'Agent with this OpenClaw ID already exists');
      }

      const agentId = ids.agent();
      await db.insert(agents).values({
        id: agentId,
        name: body.name,
        description: body.description || null,
        avatarUrl: body.avatarUrl || null,
        openclawAgentId: body.openclawAgentId,
        maxConcurrentTasks: body.maxConcurrentTasks || 3,
        createdAt: new Date(),
      });

      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      res.status(201).json({ success: true, data: agent });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // PATCH /api/agents/:id - Update agent
  // ============================================
  router.patch('/:id', async (req, res, next) => {
    try {
      const body = updateAgentSchema.parse(req.body);

      const existing = await db.query.agents.findFirst({
        where: eq(agents.id, req.params.id),
      });

      if (!existing) {
        throw new AppError(404, 'AGENT_NOT_FOUND', 'Agent not found');
      }

      await db.update(agents).set(body).where(eq(agents.id, req.params.id));

      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, req.params.id),
      });

      res.json({ success: true, data: agent });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // GET /api/agents/:id/tasks - Get agent's tasks
  // ============================================
  router.get('/:id/tasks', async (req, res, next) => {
    try {
      const { status } = req.query;

      let result;
      if (status) {
        result = await db
          .select()
          .from(tasks)
          .where(eq(tasks.assignedAgentId, req.params.id))
          .orderBy(desc(tasks.createdAt));
      } else {
        result = await db
          .select()
          .from(tasks)
          .where(eq(tasks.assignedAgentId, req.params.id))
          .orderBy(desc(tasks.createdAt));
      }

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // DELETE /api/agents/:id - Soft delete (deactivate)
  // ============================================
  router.delete('/:id', async (req, res, next) => {
    try {
      await db
        .update(agents)
        .set({ isActive: false })
        .where(eq(agents.id, req.params.id));

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
