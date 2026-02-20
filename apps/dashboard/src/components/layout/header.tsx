'use client';

import { Activity, Bot, ListTodo, Zap } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { DashboardStats } from '@workspace/types';

interface HeaderProps {
  stats?: DashboardStats;
}

export function Header({ stats }: HeaderProps) {
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-surface-200 px-4 flex items-center justify-between">
      {/* Left - Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-lg">MISSION CONTROL</span>
      </div>

      {/* Center - Stats */}
      <div className="flex items-center gap-8">
        <StatItem
          icon={<Bot className="w-4 h-4" />}
          value={stats?.activeAgents ?? 0}
          label="AGENTS ACTIVE"
        />
        <StatItem
          icon={<ListTodo className="w-4 h-4" />}
          value={stats?.activeTasks ?? 0}
          label="TASKS IN QUEUE"
        />
        <StatItem
          icon={<Activity className="w-4 h-4" />}
          value={formatNumber(stats?.totalTokens ?? 0)}
          label="TOKENS USED"
        />
      </div>

      {/* Right - Status & Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            ACTIVE
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-semibold">{currentTime}</div>
          <div className="text-xs text-surface-500">{currentDate}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-600">ONLINE</span>
        </div>
      </div>
    </header>
  );
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-surface-400">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-surface-500">{label}</div>
      </div>
    </div>
  );
}
