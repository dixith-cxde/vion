"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { TaskLifecycle } from "@/lib/generated/prisma/client";
import { useTasks } from "@/lib/hooks/use-tasks";
import { groupTasks } from "@/lib/tasks/group-tasks";

import { ViewTabs } from "@/app/_components/tasks/view-tabs";
import { KanbanBoard } from "@/app/_components/tasks/kanban-view";
import { EmptyState } from "@/app/_components/tasks/task-empty-state";
import { TasksHeader } from "@/app/_components/tasks/task-header";
import { TasksStats } from "@/app/_components/tasks/task-stats";
import { TaskProgress } from "@/app/_components/tasks/task-progress";

import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const LIFECYCLE_OPTIONS: TaskLifecycle[] = ["ACTIVE", "PLANNED", "UPCOMING", "DRAFT", "ARCHIVED"];

function formatLifecycle(value: TaskLifecycle) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function TasksPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId as string;

  const router = useRouter();

  const { tasks, loading, createTask, updateStatus } = useTasks(workspaceId);

  const [view, setView] = useState<TaskLifecycle>("ACTIVE");

  const counts = Object.fromEntries(
    LIFECYCLE_OPTIONS.map((lc) => [lc, tasks.filter((t) => t.lifecycle === lc).length])
  ) as Record<TaskLifecycle, number>;

  const lifecycleTasks = tasks.filter((t) => t.lifecycle === view);

  const grouped = groupTasks(lifecycleTasks);

  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;

  const completionRate = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  async function handleCreateTask() {
    const taskId = await createTask("New Task", "TODO");

    if (!taskId) {
      toast({
        title: "Failed to create task",
      });

      return;
    }

    router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />

        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-auto bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      <div className="relative z-10 px-5 pb-8 pt-5 md:px-8">
        <TasksHeader
          tasks={tasks.length}
          doneCount={doneCount}
          inProgressCount={inProgressCount}
          onCreateTask={handleCreateTask}
        />

        {/*<TasksStats
          tasks={tasks.length}
          doneCount={doneCount}
          inProgressCount={inProgressCount}
          completionRate={completionRate}
        />*/}

        <TaskProgress
          tasks={tasks.length}
          doneCount={doneCount}
          inProgressCount={inProgressCount}
          completionRate={completionRate}
        />

        <Separator className="mt-5" />
        <div className="mb-6 mt-8 flex items-center justify-between gap-4 sticky inset-0 py-5 bg-white z-20">
          <ViewTabs view={view} setView={setView} counts={counts} />

          <p className="text-xs text-muted-foreground">
            {counts[view]} in {formatLifecycle(view).toLowerCase()}
          </p>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Create the first task to begin tracking work."
            actionLabel="Create first task"
            onAction={handleCreateTask}
          />
        ) : lifecycleTasks.length === 0 ? (
          <EmptyState
            title={`No ${formatLifecycle(view).toLowerCase()} tasks`}
            description="Switch lifecycle views or create a task."
          />
        ) : (
          <div className="relative pt-2">
            <KanbanBoard grouped={grouped} onUpdate={updateStatus} />
          </div>
        )}
      </div>
    </div>
  );
}
