"use client";

import { useDroppable } from "@dnd-kit/core";
import { CheckCircle2, Circle, TimerReset } from "lucide-react";

import { Task, TaskStatus } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TaskCard } from "./kanban-card";

export function Column({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: {
      type: "column",
      status,
    },
  });

  return (
    <Card
      ref={setNodeRef}
      className="flex min-h-[28rem] flex-col overflow-hidden rounded-3xl border-border/70 bg-muted/20 shadow-none"
    >
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-background p-2">{getStatusIcon(status)}</div>
            <div>
              <div className="text-sm font-semibold">{formatStatus(status)}</div>
              <div className="text-xs text-muted-foreground">{getStatusDescription(status)}</div>
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

export function formatStatus(status: TaskStatus) {
  return status.replace("_", " ");
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
