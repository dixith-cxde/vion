"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Task, TaskStatus } from "@/lib/generated/prisma/client";
import { isKanbanStatus } from "@/lib/tasks/task-rules";
import { Column } from "./kanban-column";

export type KanbanBoardProps = {
  grouped: Record<TaskStatus, Task[]>;
  onUpdate: (taskId: string, status: TaskStatus) => void;
};

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function KanbanBoard({ grouped, onUpdate }: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const currentStatus = active.data.current?.status;
    const newStatus = resolveDropStatus(over);

    if (!newStatus || newStatus === currentStatus) return;

    onUpdate(taskId, newStatus);
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd} sensors={sensors}>
      <div className="grid h-full gap-4 xl:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column key={col} status={col} tasks={grouped[col]} />
        ))}
      </div>
    </DndContext>
  );
}

function resolveDropStatus(over: DragEndEvent["over"]) {
  const status = over?.data.current?.status;

  if (status && isKanbanStatus(status as TaskStatus)) {
    return status as TaskStatus;
  }

  if (typeof over?.id === "string" && isKanbanStatus(over.id as TaskStatus)) {
    return over.id as TaskStatus;
  }

  return null;
}
