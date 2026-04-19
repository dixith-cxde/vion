"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import {
  CheckCircle2,
  Circle,
  GripVertical,
  TimerReset,
} from "lucide-react";

import { Task, TaskStatus } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Props = {
  grouped: Record<TaskStatus, Task[]>;
  onUpdate: (taskId: string, status: TaskStatus) => void;
};

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function KanbanBoard({ grouped, onUpdate }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    onUpdate(taskId, newStatus);
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div className="grid h-full gap-4 xl:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column key={col} status={col} tasks={grouped[col]} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <Card
      ref={setNodeRef}
      className="flex min-h-[28rem] flex-col overflow-hidden rounded-3xl border-border/70 bg-muted/20 shadow-none"
    >
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-background p-2">
              {getStatusIcon(status)}
            </div>
            <div>
              <div className="text-sm font-semibold">
                {formatStatus(status)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getStatusDescription(status)}
              </div>
            </div>
          </div>

          <Badge className="bg-background text-xs">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 text-xs text-muted-foreground">
              No tasks
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const isDraggable = task.lifecycle === "ACTIVE";
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: !isDraggable,
    });

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if (pointerStartRef.current) {
      const deltaX = event.clientX - pointerStartRef.current.x;
      const deltaY = event.clientY - pointerStartRef.current.y;
      const moved = Math.hypot(deltaX, deltaY);

      if (moved > 6) {
        pointerStartRef.current = null;
        return;
      }
    }

    pointerStartRef.current = null;
    router.push(`/workspaces/${task.workspaceId}/tasks/${task.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
      }}
      className={`cursor-pointer rounded-2xl border border-border/70 bg-background p-3 text-sm transition-[transform,box-shadow,border-color,background-color] hover:border-border hover:bg-background ${
        isDragging ? "z-20 shadow-lg ring-1 ring-border/70" : "hover:shadow-sm"
      } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="line-clamp-2 font-medium text-foreground">
            {task.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(task.updatedAt)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-border/70 bg-muted/40 text-[10px] font-medium"
          >
            {formatPriority(task.priority)}
          </Badge>
          {isDraggable ? (
            <span className="rounded-full bg-muted p-1 text-muted-foreground">
              <GripVertical className="size-3.5" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatStatus(status: TaskStatus) {
  return status.replace("_", " ");
}

function formatPriority(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getStatusDescription(status: TaskStatus) {
  if (status === "TODO") return "Ready to start";
  if (status === "IN_PROGRESS") return "In progress";
  return "Completed";
}

function getStatusIcon(status: TaskStatus) {
  if (status === "TODO") return <Circle className="size-4" />;
  if (status === "IN_PROGRESS") return <TimerReset className="size-4" />;
  return <CheckCircle2 className="size-4" />;
}
