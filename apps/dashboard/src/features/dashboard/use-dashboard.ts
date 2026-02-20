import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { dashboardApi } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket';
import type { DashboardData } from '@workspace/types';

export function useDashboard() {
  const queryClient = useQueryClient();
  const { setOnTaskUpdate, setOnAgentUpdate, setOnActivity } = useWebSocket();

  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 30000, // Refresh every 30 seconds as fallback
  });

  // Handle real-time updates
  useEffect(() => {
    setOnTaskUpdate((taskId, changes) => {
      queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
        if (!old) return old;

        // Update task in kanban columns
        const newKanban = old.kanban.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) =>
            task.id === taskId ? { ...task, ...changes } : task
          ),
        }));

        // If status changed, move task to new column
        if (changes.status) {
          const task = newKanban
            .flatMap((c) => c.tasks)
            .find((t) => t.id === taskId);

          if (task) {
            // Remove from old column
            newKanban.forEach((column) => {
              column.tasks = column.tasks.filter((t) => t.id !== taskId);
              column.count = column.tasks.length;
            });

            // Add to new column
            const targetColumn = newKanban.find((c) => c.id === changes.status);
            if (targetColumn) {
              targetColumn.tasks.unshift({ ...task, ...changes });
              targetColumn.count = targetColumn.tasks.length;
            }
          }
        }

        return { ...old, kanban: newKanban };
      });
    });

    setOnAgentUpdate((agentId, changes) => {
      queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
        if (!old) return old;

        const newAgents = old.agents.map((agent) =>
          agent.id === agentId ? { ...agent, ...changes } : agent
        );

        // Update stats
        const newStats = {
          ...old.stats,
          activeAgents: newAgents.filter((a) => a.status === 'working').length,
        };

        return { ...old, agents: newAgents, stats: newStats };
      });
    });

    setOnActivity((activity) => {
      queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
        if (!old) return old;

        return {
          ...old,
          recentActivity: [activity, ...old.recentActivity.slice(0, 49)],
        };
      });
    });
  }, [queryClient, setOnTaskUpdate, setOnAgentUpdate, setOnActivity]);

  return query;
}
