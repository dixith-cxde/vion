"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckSquare2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { TaskLifecycle } from "@/lib/generated/prisma/client";

import { useTasks } from "@/lib/hooks/use-tasks";
import { groupTasks } from "@/lib/tasks/group-tasks";

import { ViewTabs } from "@/app/_components/tasks/view-tabs";
import { KanbanBoard } from "@/app/_components/tasks/kanban-view";

export default function TasksPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId as string;

  const { tasks, loading, createTask, updateStatus } = useTasks(workspaceId);

  const [view, setView] = useState<TaskLifecycle>("ACTIVE");

  // ---------- COUNTS ----------
  const counts: Record<TaskLifecycle, number> = {
    ACTIVE: tasks.filter((t) => t.lifecycle === "ACTIVE").length,
    PLANNED: tasks.filter((t) => t.lifecycle === "PLANNED").length,
    UPCOMING: tasks.filter((t) => t.lifecycle === "UPCOMING").length,
    DRAFT: tasks.filter((t) => t.lifecycle === "DRAFT").length,
    ARCHIVED: tasks.filter((t) => t.lifecycle === "ARCHIVED").length,
  };

  // ---------- FILTER BY LIFECYCLE (CRITICAL CHANGE)
  const lifecycleTasks = tasks.filter((t) => t.lifecycle === view);

  // ---------- GROUP BY STATUS (KANBAN)
  const grouped = groupTasks(lifecycleTasks);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col rounded-none border-0 shadow-none">
          {/* HEADER */}
          <CardHeader className="border-b px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-semibold">Workspace Tasks</h1>
                <p className="text-sm text-muted-foreground">
                  Track execution and manage lifecycle
                </p>
              </div>

              {/* CREATE */}
              <Button size="lg" onClick={() => createTask("New Task", "TODO")}>
                New Task
              </Button>
            </div>

            {/* BADGES */}
            <div className="flex gap-2 mt-2">
              <Badge>{tasks.length} tasks</Badge>
              <Badge>
                <Sparkles className="mr-1 size-3" />
                {counts[view]} {view.toLowerCase()}
              </Badge>
            </div>
          </CardHeader>

          {/* CONTENT */}
          <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <ViewTabs view={view} setView={setView} counts={counts} />

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
                <CheckSquare2 className="mb-2" />
                No tasks yet
              </div>
            ) : (
              <KanbanBoard grouped={grouped} onUpdate={updateStatus} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
