"use client";

import { Task } from "@/lib/generated/prisma/client";

type Props = {
  task: Task | null;
  onClose: () => void;
};

export function TaskDetailPanel({ task, onClose }: Props) {
  if (!task) return null;

  return (
    <div className="w-[360px] border-l h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b flex justify-between">
        <span className="text-sm font-medium">Task</span>
        <button onClick={onClose} className="text-xs">
          Close
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Title</label>
          <input
            className="w-full mt-1 border rounded px-2 py-1 text-sm"
            defaultValue={task.title}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <div className="text-sm">{task.status}</div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Lifecycle</label>
          <div className="text-sm">{task.lifecycle}</div>
        </div>
      </div>
    </div>
  );
}
