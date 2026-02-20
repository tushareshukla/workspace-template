import { Router } from 'express';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import type { Database } from '@workspace/database';
import { tasks, agents, activities } from '@workspace/database';
import type { DashboardData, KanbanColumn, TaskStatus } from '@workspace/types';

const KANBAN_COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'assigned', title: 'Assigned' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'blocked', title: 'Blocked' },
  { id: 'done', title: 'Done' },
];

export function createDashboardRoutes(db: Database): Router {
  const router = Router();

  // ============================================
  // GET /api/dashboard - Full dashboard data
  // ============================================
  router.get('/', async (req, res, next) => {
    try {
      // Get all non-done tasks for kanban
      const allTasks = await db
        .select()
        .from(tasks)
        .orderBy(tasks.columnOrder, desc(tasks.createdAt));

      // Get all agents
      const allAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.isActive, true))
        .orderBy(desc(agents.lastActiveAt));

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivity = await db
        .select()
        .from(activities)
        .where(gte(activities.createdAt, oneDayAgo))
        .orderBy(desc(activities.createdAt))
        .limit(50);

      // Build kanban columns
      const kanban: KanbanColumn[] = KANBAN_COLUMNS.map((col) => ({
        id: col.id,
        title: col.title,
        tasks: allTasks.filter((t) => t.status === col.id),
        count: allTasks.filter((t) => t.status === col.id).length,
      }));

      // Calculate stats
      const stats = {
        totalTasks: allTasks.length,
        activeTasks: allTasks.filter((t) =>
          ['assigned', 'in_progress', 'review'].includes(t.status)
        ).length,
        completedTasks: allTasks.filter((t) => t.status === 'done').length,
        blockedTasks: allTasks.filter((t) => t.status === 'blocked').length,
        activeAgents: allAgents.filter((a) => a.status === 'working').length,
        totalAgents: allAgents.length,
        totalTokens: allTasks.reduce((sum, t) => sum + t.tokensUsed, 0),
      };

      const data: DashboardData = {
        stats,
        kanban,
        agents: allAgents as any,
        recentActivity: recentActivity as any,
      };

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // GET /api/dashboard/stats - Quick stats only
  // ============================================
  router.get('/stats', async (req, res, next) => {
    try {
      const taskCounts = await db
        .select({
          status: tasks.status,
          count: sql<number>`count(*)`,
        })
        .from(tasks)
        .groupBy(tasks.status);

      const agentCounts = await db
        .select({
          status: agents.status,
          count: sql<number>`count(*)`,
        })
        .from(agents)
        .where(eq(agents.isActive, true))
        .groupBy(agents.status);

      const tokenSum = await db
        .select({
          total: sql<number>`sum(${tasks.tokensUsed})`,
        })
        .from(tasks);

      const taskMap = Object.fromEntries(
        taskCounts.map((t) => [t.status, Number(t.count)])
      );

      const agentMap = Object.fromEntries(
        agentCounts.map((a) => [a.status, Number(a.count)])
      );

      res.json({
        success: true,
        data: {
          tasks: {
            inbox: taskMap.inbox || 0,
            assigned: taskMap.assigned || 0,
            inProgress: taskMap.in_progress || 0,
            review: taskMap.review || 0,
            blocked: taskMap.blocked || 0,
            done: taskMap.done || 0,
            cancelled: taskMap.cancelled || 0,
          },
          agents: {
            idle: agentMap.idle || 0,
            working: agentMap.working || 0,
            waiting: agentMap.waiting || 0,
            total: Object.values(agentMap).reduce((a, b) => a + b, 0),
          },
          tokens: {
            total: tokenSum[0]?.total || 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // ============================================
  // GET /api/dashboard/activity - Recent activity
  // ============================================
  router.get('/activity', async (req, res, next) => {
    try {
      const { limit = '20', since } = req.query;

      let query = db
        .select()
        .from(activities)
        .orderBy(desc(activities.createdAt))
        .limit(parseInt(limit as string));

      if (since) {
        const sinceDate = new Date(since as string);
        query = db
          .select()
          .from(activities)
          .where(gte(activities.createdAt, sinceDate))
          .orderBy(desc(activities.createdAt))
          .limit(parseInt(limit as string));
      }

      const result = await query;

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
