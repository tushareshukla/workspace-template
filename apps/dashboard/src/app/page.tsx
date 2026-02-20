'use client';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { KanbanBoard } from '@/features/kanban/kanban-board';
import { LiveFeed } from '@/features/activity/live-feed';
import { useDashboard } from '@/features/dashboard/use-dashboard';

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-surface-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">Failed to load dashboard</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <Header stats={data?.stats} />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Agents */}
        <Sidebar agents={data?.agents || []} />

        {/* Main Content - Kanban Board */}
        <main className="flex-1 overflow-hidden p-4">
          <KanbanBoard columns={data?.kanban || []} />
        </main>

        {/* Right Sidebar - Live Feed */}
        <aside className="w-80 border-l border-surface-200 bg-white overflow-y-auto">
          <LiveFeed activities={data?.recentActivity || []} />
        </aside>
      </div>
    </div>
  );
}
