'use client';

import {
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  MessageSquare,
  Bot,
  Zap,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Activity } from '@workspace/types';

interface LiveFeedProps {
  activities: Activity[];
}

export function LiveFeed({ activities }: LiveFeedProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">LIVE FEED</h3>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-surface-500">
              {activities.length} active
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-3 text-sm">
          <button className="text-primary-600 font-medium border-b-2 border-primary-600 pb-1">
            All ({activities.length})
          </button>
          <button className="text-surface-500 hover:text-surface-700 pb-1">
            Tasks
          </button>
          <button className="text-surface-500 hover:text-surface-700 pb-1">
            Comments
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}

        {activities.length === 0 && (
          <div className="p-8 text-center text-surface-400">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const { icon, color, text } = getActivityDisplay(activity);

  return (
    <div className="p-4 border-b border-surface-100 hover:bg-surface-50">
      <div className="flex gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            color
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{text}</p>
          <p className="text-xs text-surface-400 mt-1">
            {formatRelativeTime(activity.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function getActivityDisplay(activity: Activity): {
  icon: React.ReactNode;
  color: string;
  text: string;
} {
  const details = activity.details as Record<string, unknown>;

  switch (activity.action) {
    case 'task_created':
      return {
        icon: <Zap className="w-4 h-4 text-blue-600" />,
        color: 'bg-blue-100',
        text: `Task created: "${details?.title || 'Unknown'}"`,
      };

    case 'task_assigned':
      return {
        icon: <Bot className="w-4 h-4 text-purple-600" />,
        color: 'bg-purple-100',
        text: `Task assigned to ${details?.agentName || 'agent'}`,
      };

    case 'task_started':
      return {
        icon: <PlayCircle className="w-4 h-4 text-green-600" />,
        color: 'bg-green-100',
        text: 'Agent started working on task',
      };

    case 'task_completed':
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        color: 'bg-green-100',
        text: 'Task completed successfully',
      };

    case 'task_failed':
      return {
        icon: <AlertCircle className="w-4 h-4 text-red-600" />,
        color: 'bg-red-100',
        text: `Task failed: ${details?.error || 'Unknown error'}`,
      };

    case 'task_blocked':
      return {
        icon: <PauseCircle className="w-4 h-4 text-yellow-600" />,
        color: 'bg-yellow-100',
        text: `Task blocked: ${details?.reason || 'Needs input'}`,
      };

    case 'task_unblocked':
      return {
        icon: <PlayCircle className="w-4 h-4 text-green-600" />,
        color: 'bg-green-100',
        text: 'Task unblocked, resuming...',
      };

    case 'comment_added':
      return {
        icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
        color: 'bg-blue-100',
        text: 'New comment added',
      };

    default:
      return {
        icon: <Zap className="w-4 h-4 text-surface-600" />,
        color: 'bg-surface-100',
        text: activity.action.replace(/_/g, ' '),
      };
  }
}
