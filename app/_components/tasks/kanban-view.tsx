"use client";

import {
  DndContext,
  DragEndEvent,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useState } from "react";
import { CheckCircle2, Circle, Plus, TimerReset } from "lucide-react";

import { Task, TaskStatus } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  grouped: Record<TaskStatus, Task[]>;
  onCreate: (title: string, status: TaskStatus) => void;
  onUpdate: (taskId: string, status: TaskStatus) => void;
};

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function KanbanBoard({ grouped, onCreate, onUpdate }: Props) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    onUpdate(taskId, newStatus);
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid h-full gap-4 xl:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            status={col}
            tasks={grouped[col]}
            onCreate={onCreate}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  onCreate,
}: {
  status: TaskStatus;
  tasks: Task[];
  onCreate: (title: string, status: TaskStatus) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const [input, setInput] = useState("");

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
              <div className="text-sm font-semibold">{formatStatus(status)}</div>
              <div className="text-xs text-muted-foreground">
                {getStatusDescription(status)}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-none bg-background px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
          >
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 text-center text-xs text-muted-foreground">
              Drop a task here or create one below.
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-background p-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Add a ${formatStatus(status).toLowerCase()} task`}
              className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            />
            <Button
              size="sm"
              className="h-9 rounded-full px-4"
              onClick={() => {
                onCreate(input, status);
                setInput("");
              }}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
      }}
      className="cursor-grab rounded-2xl border border-border/70 bg-background p-3 text-sm shadow-none transition-colors active:cursor-grabbing hover:border-foreground/15 hover:bg-muted/30"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="line-clamp-2 font-medium leading-5">{task.title}</div>
          </div>
          <Badge
            variant="muted"
            className="shrink-0 border-none bg-muted px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]"
          >
            {formatPriority(task.priority)}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{task.type}</span>
          <span>{formatUpdatedLabel(task.updatedAt)}</span>
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

function formatUpdatedLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getStatusDescription(status: TaskStatus) {
  if (status === "TODO") return "Ready to be picked up";
  if (status === "IN_PROGRESS") return "Currently moving through execution";
  return "Completed and ready to review";
}

function getStatusIcon(status: TaskStatus) {
  const className = "size-4 text-muted-foreground";

  if (status === "TODO") {
    return <Circle className={className} />;
  }

  if (status === "IN_PROGRESS") {
    return <TimerReset className={className} />;
  }

  return <CheckCircle2 className={className} />;
}
