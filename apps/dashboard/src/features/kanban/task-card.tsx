'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Bot, Clock, MessageSquare } from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import type { Task } from '@workspace/types';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityClasses = {
    low: 'priority-badge low',
    normal: 'priority-badge normal',
    high: 'priority-badge high',
    urgent: 'priority-badge urgent',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'kanban-card',
        (isDragging || isSortableDragging) && 'dragging',
        task.status === 'blocked' && 'border-red-300 bg-red-50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={priorityClasses[task.priority]}>
          {task.priority.toUpperCase()}
        </span>
        {task.status === 'blocked' && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-2">{truncate(task.title, 60)}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-surface-500 mb-3">
          {truncate(task.description, 100)}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-surface-400">
        <div className="flex items-center gap-3">
          {/* Agent */}
          {task.agent && (
            <div className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              <span>{task.agent.name}</span>
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(task.createdAt)}</span>
          </div>
        </div>

        {/* Comments indicator */}
        {task.comments && task.comments.length > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{task.comments.length}</span>
          </div>
        )}
      </div>

      {/* Blocked indicator */}
      {task.status === 'blocked' && task.blocks && task.blocks.length > 0 && (
        <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700">
          <strong>Blocked:</strong>{' '}
          {task.blocks[task.blocks.length - 1]?.reason}
        </div>
      )}
    </div>
  );
}
