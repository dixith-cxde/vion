"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckSquare2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Task, TaskLifecycle } from "@/lib/generated/prisma/client";
import { useTasks } from "@/lib/hooks/use-tasks";
import { groupTasks } from "@/lib/tasks/group-tasks";
import { ViewTabs } from "@/app/_components/tasks/view-tabs";
import { KanbanBoard } from "@/app/_components/tasks/kanban-view";
import { TaskList } from "@/app/_components/tasks/task-lists";

export default function TasksPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId as string;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { tasks, loading, createTask, updateStatus } = useTasks(workspaceId);

  const [view, setView] = useState<TaskLifecycle>("ACTIVE");

  const counts: Record<TaskLifecycle, number> = {
    ACTIVE: tasks.filter((task) => task.lifecycle === "ACTIVE").length,
    PLANNED: tasks.filter((task) => task.lifecycle === "PLANNED").length,
    UPCOMING: tasks.filter((task) => task.lifecycle === "UPCOMING").length,
    DRAFT: tasks.filter((task) => task.lifecycle === "DRAFT").length,
    ARCHIVED: tasks.filter((task) => task.lifecycle === "ARCHIVED").length,
  };

  const visibleTasks = tasks.filter((t) => t.lifecycle === view);
  const grouped = groupTasks(tasks);
  const activeTaskCount = counts.ACTIVE;

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center text-sm text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Card className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-none border-0 shadow-none">
        <CardHeader className="sticky top-0 z-20 gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-5">
          <div className="space-y-1">
            <h1 className="text-[1.4rem] font-semibold tracking-[-0.04em] text-foreground md:text-[1.65rem]">
              Workspace tasks
            </h1>
            <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
              Track execution in a clean board, then review planned and archived
              work in a quieter list view.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="border-none bg-muted px-5 py-2 text-xs font-medium"
              >
                {tasks.length} total task{tasks.length === 1 ? "" : "s"}
              </Badge>
              <Badge
                variant="document"
                className="border-none px-5 py-2 text-xs font-medium"
              >
                Tasks
              </Badge>
            </div>

            <div className="inline-flex items-center gap-2 px-2">
              <Badge
                variant="muted"
                className="border-none bg-muted px-5 py-2 text-xs font-medium"
              >
                View: {formatLabel(view)}
              </Badge>
              <Badge
                variant="muted"
                className="border-none bg-muted px-5 py-2 text-xs font-medium"
              >
                <Sparkles className="mr-1 size-3.5" />
                {activeTaskCount} active
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
          <div className="flex h-full flex-col gap-4">
            <ViewTabs view={view} setView={setView} counts={counts} />

            {tasks.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <CheckSquare2 className="size-5 text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold">No tasks yet</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Start by adding an active task to the board, then move work
                  across columns as it progresses.
                </p>
              </div>
            ) : view === "ACTIVE" ? (
              <KanbanBoard
                grouped={grouped}
                onCreate={createTask}
                onUpdate={updateStatus}
              />
            ) : (
              <TaskList lifecycle={view} tasks={visibleTasks} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatLabel(value: TaskLifecycle) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
