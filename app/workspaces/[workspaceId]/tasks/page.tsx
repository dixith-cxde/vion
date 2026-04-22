"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CheckSquare2,
  LoaderCircle,
  Plus,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { TaskLifecycle } from "@/lib/generated/prisma/client";

import { useTasks } from "@/lib/hooks/use-tasks";
import { groupTasks } from "@/lib/tasks/group-tasks";

import { ViewTabs } from "@/app/_components/tasks/view-tabs";
import { KanbanBoard } from "@/app/_components/tasks/kanban-view";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

export default function TasksPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId as string;
  const { activeWorkspace } = useWorkspace();

  const { tasks, loading, createTask, updateStatus } = useTasks(workspaceId);

  const [view, setView] = useState<TaskLifecycle>("ACTIVE");

  const counts: Record<TaskLifecycle, number> = {
    ACTIVE: tasks.filter((task) => task.lifecycle === "ACTIVE").length,
    PLANNED: tasks.filter((task) => task.lifecycle === "PLANNED").length,
    UPCOMING: tasks.filter((task) => task.lifecycle === "UPCOMING").length,
    DRAFT: tasks.filter((task) => task.lifecycle === "DRAFT").length,
    ARCHIVED: tasks.filter((task) => task.lifecycle === "ARCHIVED").length,
  };

  const lifecycleTasks = tasks.filter((task) => task.lifecycle === view);
  const grouped = groupTasks(lifecycleTasks);
  const doneCount = tasks.filter((task) => task.status === "DONE").length;
  const completionRate =
    tasks.length === 0 ? "0%" : `${Math.round((doneCount / tasks.length) * 100)}%`;

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge
              variant="muted"
              className="w-fit px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
            >
              Workspace Tasks
            </Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeWorkspace?.name ?? "Workspace"} tasks
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Track execution across lifecycle stages, keep active work visible,
                and move tasks through the board in any lifecycle view without
                losing context.
              </p>
            </div>
          </div>

          <Button
            onClick={() => createTask("New Task", "TODO")}
            className="rounded-lg"
          >
            <Plus className="size-4" />
            New task
          </Button>
        </header>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Overview"
            title="Execution summary"
            description="A quick read on workload, current lifecycle focus, and completion progress."
          />
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              label="Total tasks"
              value={`${tasks.length}`}
              hint="All tracked work items"
            />
            <StatCard
              label="Current lifecycle"
              value={formatLifecycle(view)}
              hint={`${counts[view]} task${counts[view] === 1 ? "" : "s"} in this stage`}
            />
            <StatCard
              label="Completed"
              value={`${doneCount}`}
              hint="Tasks marked done"
            />
            <StatCard
              label="Completion rate"
              value={completionRate}
              hint="Based on current task status"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              eyebrow="Lifecycle"
              title="Task stages"
              description="Switch between lifecycle groups and manage status directly inside the board for whichever stage you are viewing."
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              <span>
                {counts[view]} visible in {formatLifecycle(view).toLowerCase()}
              </span>
            </div>
          </div>
          <ViewTabs view={view} setView={setView} counts={counts} />
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Board"
            title={`${formatLifecycle(view)} workflow`}
            description="Drag tasks between status columns in the current lifecycle view, or open a task for its full detail page."
          />

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Create the first task to start tracking execution, planning, and deliverables for this workspace."
              actionLabel="Create first task"
              onAction={() => createTask("New Task", "TODO")}
            />
          ) : lifecycleTasks.length === 0 ? (
            <EmptyState
              title={`No ${formatLifecycle(view).toLowerCase()} tasks`}
              description="Switch lifecycle views or add a new task to populate this stage."
            />
          ) : (
            <div className="rounded-lg border border-border/70 p-3 md:p-4">
              <KanbanBoard grouped={grouped} onUpdate={updateStatus} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{hint}</div>
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
    <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted">
        <CheckSquare2 className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-5 rounded-lg">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function formatLifecycle(value: TaskLifecycle) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
