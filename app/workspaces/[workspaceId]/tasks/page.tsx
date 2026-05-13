"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TaskLifecycle } from "@/lib/generated/prisma/client";
import { useTasks } from "@/lib/hooks/use-tasks";
import { groupTasks } from "@/lib/tasks/group-tasks";
import { ViewTabs } from "@/app/_components/tasks/view-tabs";
import { KanbanBoard } from "@/app/_components/tasks/kanban-view";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LIFECYCLE_OPTIONS: TaskLifecycle[] = [
  "ACTIVE",
  "PLANNED",
  "UPCOMING",
  "DRAFT",
  "ARCHIVED",
];

function formatLifecycle(value: TaskLifecycle) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function TasksPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId as string;
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  const { tasks, loading, createTask, updateStatus } = useTasks(workspaceId);
  const [view, setView] = useState<TaskLifecycle>("ACTIVE");

  const counts = Object.fromEntries(
    LIFECYCLE_OPTIONS.map((lc) => [
      lc,
      tasks.filter((t) => t.lifecycle === lc).length,
    ]),
  ) as Record<TaskLifecycle, number>;

  const lifecycleTasks = tasks.filter((t) => t.lifecycle === view);
  const grouped = groupTasks(lifecycleTasks);

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const completionRate =
    tasks.length === 0
      ? "—"
      : `${Math.round((doneCount / tasks.length) * 100)}%`;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2.5">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-4 py-8 md:px-6 md:py-10">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {doneCount}{" "}
            done · {completionRate} completion
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-full"
          onClick={async () => {
            const taskId = await createTask("New Task", "TODO");
            if (!taskId) {
              toast({ title: "Failed to create task" });
              return;
            }
            router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
          }}
        >
          <Plus className="size-3.5" />
          New task
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={String(tasks.length)} />
        <StatCard
          label="In progress"
          value={String(tasks.filter((t) => t.status === "IN_PROGRESS").length)}
        />
        <StatCard label="Done" value={String(doneCount)} />
        <StatCard label="Completion" value={completionRate} />
      </div>

      <Separator className="mb-8" />

      {/* Lifecycle tabs */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <ViewTabs view={view} setView={setView} counts={counts} />
        <p className="shrink-0 text-xs text-muted-foreground">
          {counts[view]} in {formatLifecycle(view).toLowerCase()}
        </p>
      </div>

      {/* Board */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create the first task to start tracking work for this workspace."
          actionLabel="Create first task"
          onAction={async () => {
            const taskId = await createTask("New Task", "TODO");
            if (taskId) router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
          }}
        />
      ) : lifecycleTasks.length === 0 ? (
        <EmptyState
          title={`No ${formatLifecycle(view).toLowerCase()} tasks`}
          description="Switch lifecycle views or create a new task for this stage."
        />
      ) : (
        <div className="rounded-2xl border border-border/60 p-4">
          <KanbanBoard grouped={grouped} onUpdate={updateStatus} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4 rounded-full">
          <Plus className="size-3.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
