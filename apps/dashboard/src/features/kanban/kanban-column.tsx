'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { TaskCard } from './task-card';
import { cn } from '@/lib/utils';
import type { KanbanColumn as KanbanColumnType } from '@workspace/types';

interface KanbanColumnProps {
  column: KanbanColumnType;
}

const columnColors: Record<string, string> = {
  inbox: 'border-t-surface-400',
  assigned: 'border-t-blue-400',
  in_progress: 'border-t-yellow-400',
  review: 'border-t-purple-400',
  blocked: 'border-t-red-400',
  done: 'border-t-green-400',
};

export function KanbanColumn({ column }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'kanban-column w-72 flex-shrink-0 border-t-4',
        columnColors[column.id] || 'border-t-surface-300',
        isOver && 'bg-surface-200'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-current opacity-60" />
          <h3 className="font-semibold text-sm uppercase">{column.title}</h3>
          <span className="text-xs text-surface-500 bg-surface-200 px-2 py-0.5 rounded-full">
            {column.count}
          </span>
        </div>
        <button className="p-1 hover:bg-surface-200 rounded">
          <Plus className="w-4 h-4 text-surface-400" />
        </button>
      </div>

      {/* Tasks */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}

        {column.tasks.length === 0 && (
          <div className="text-center py-8 text-surface-400 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
