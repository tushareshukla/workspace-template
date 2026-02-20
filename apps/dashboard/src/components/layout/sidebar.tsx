'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@workspace/types';

interface SidebarProps {
  agents: Agent[];
}

export function Sidebar({ agents }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeCount = agents.filter((a) => a.status === 'working').length;

  return (
    <aside
      className={cn(
        'bg-white border-r border-surface-200 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-surface-200 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="font-semibold text-surface-900">AGENTS</h2>
            <p className="text-sm text-surface-500">
              {agents.length} total{' '}
              <span className="text-green-600">{activeCount} ACTIVE</span>
            </p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-surface-100 rounded"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Agent List */}
      <div className="p-2 space-y-1">
        {agents.map((agent) => (
          <AgentItem key={agent.id} agent={agent} isCollapsed={isCollapsed} />
        ))}

        {/* Add Agent Button */}
        {!isCollapsed && (
          <button className="w-full flex items-center gap-2 p-2 text-surface-500 hover:bg-surface-100 rounded-lg text-sm">
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
        )}
      </div>
    </aside>
  );
}

function AgentItem({
  agent,
  isCollapsed,
}: {
  agent: Agent;
  isCollapsed: boolean;
}) {
  const initials = agent.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColors = {
    idle: 'bg-surface-400',
    working: 'bg-green-500',
    waiting: 'bg-yellow-500',
    offline: 'bg-red-500',
  };

  const statusLabels = {
    idle: 'IDLE',
    working: 'WORKING',
    waiting: 'WAITING',
    offline: 'OFFLINE',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 cursor-pointer',
        agent.status === 'working' && 'bg-green-50'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm',
            agent.status === 'working' ? 'bg-green-600' : 'bg-primary-500'
          )}
        >
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            statusColors[agent.status]
          )}
        />
      </div>

      {/* Info */}
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{agent.name}</div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs',
                agent.status === 'working'
                  ? 'text-green-600'
                  : 'text-surface-500'
              )}
            >
              {statusLabels[agent.status]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
