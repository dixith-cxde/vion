"use client";

import { ArrowRight, CheckSquare2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, TaskLifecycle } from "@/lib/generated/prisma/client";

type Props = {
  tasks: Task[];
  lifecycle: TaskLifecycle;
};

export function TaskList({ tasks, lifecycle }: Props) {
  if (!tasks.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <CheckSquare2 className="size-5 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-semibold">No {formatLifecycle(lifecycle)} tasks</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Tasks moved into this lifecycle will appear here as compact cards.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="rounded-3xl border-border/70 bg-background shadow-none transition-colors hover:border-foreground/15 hover:bg-muted/30"
        >
          <CardHeader className="gap-3 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-muted p-2.5">
                <CheckSquare2 className="size-4 text-muted-foreground" />
              </div>
              <Badge
                variant="outline"
                className="border-none bg-muted px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
              >
                {formatStatus(task.status)}
              </Badge>
            </div>
            <CardTitle className="line-clamp-2 text-base leading-6">
              {task.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="muted"
                className="border-none bg-muted px-3 py-1 text-xs font-medium"
              >
                {formatLifecycle(task.lifecycle)}
              </Badge>
              <Badge
                variant="muted"
                className="border-none bg-muted px-3 py-1 text-xs font-medium"
              >
                {formatPriority(task.priority)}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Updated {formatDate(task.updatedAt)}</span>
              <span className="inline-flex items-center gap-1">
                Review
                <ArrowRight className="size-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace("_", " ");
}

function formatLifecycle(lifecycle: TaskLifecycle) {
  return lifecycle.charAt(0) + lifecycle.slice(1).toLowerCase();
}

function formatPriority(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
