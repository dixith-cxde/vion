"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare2,
  FileText,
  LoaderCircle,
  TimerReset,
} from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type DashboardData = {
  documents: { id: string; title: string; updatedAt: string }[];
  tasks: { id: string; title: string; status: string }[];
  activity: {
    id: string;
    sourceLabel: string;
    targetLabel: string;
    relationshipType: string;
  }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatRelationship(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TASK_STATUS_CLASS: Record<string, string> = {
  DONE: "bg-emerald-50 text-emerald-600 border-emerald-100",
  IN_PROGRESS: "bg-amber-50 text-amber-600 border-amber-100",
  TODO: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function WorkspaceDashboard() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const workspaceId = activeWorkspace?.id;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!workspaceId) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/dashboard`);
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (err) {
        console.error(err);
        toast({
          title: "Unable to load workspace overview",
          description: "Refresh the page and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [workspaceId]);

  const summary = useMemo(() => {
    if (!data)
      return {
        doneTasks: 0,
        inProgressTasks: 0,
        latestDoc: null as DashboardData["documents"][number] | null,
      };

    const sorted = [...data.documents].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return {
      doneTasks: data.tasks.filter((t) => t.status === "DONE").length,
      inProgressTasks: data.tasks.filter((t) => t.status === "IN_PROGRESS")
        .length,
      latestDoc: sorted[0] ?? null,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2.5">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Workspace overview is unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-4 py-8 md:px-6 md:py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {activeWorkspace?.name ?? "Workspace"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => router.push(`/workspaces/${workspaceId}/documents`)}
          >
            <FileText className="size-3.5" />
            Documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}
          >
            <CheckSquare2 className="size-3.5" />
            Tasks
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Documents"
          value={String(data.documents.length)}
          icon={FileText}
          className="text-sky-600"
        />
        <StatCard
          label="Tasks"
          value={String(data.tasks.length)}
          icon={TimerReset}
          className="text-amber-600"
          hint={`${summary.inProgressTasks} in progress`}
        />
        <StatCard
          label="Completed"
          value={String(summary.doneTasks)}
          icon={CheckCircle2}
          className="text-emerald-600"
        />
        <StatCard
          label="Relationships"
          value={String(data.activity.length)}
          icon={Activity}
          className="text-fuchsia-600"
        />
      </div>

      <Separator className="mb-8" />

      {/* Content grid */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-8">
          {/* Documents */}
          <Section
            label="Documents"
            labelClassName="text-sky-600"
            title="Recent documents"
            actionLabel="View all"
            onAction={() => router.push(`/workspaces/${workspaceId}/documents`)}
          >
            {data.documents.length === 0 ? (
              <Empty icon={FileText} message="No documents yet." />
            ) : (
              <div className="space-y-1">
                {data.documents.map((doc) => (
                  <EntityRow
                    key={doc.id}
                    icon={FileText}
                    iconClassName="border-sky-100 bg-sky-50 text-sky-600"
                    title={doc.title}
                    meta={`Updated ${formatDateTime(doc.updatedAt)}`}
                    onClick={() =>
                      router.push(
                        `/workspaces/${workspaceId}/documents/${doc.id}`,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Tasks */}
          <Section
            label="Tasks"
            labelClassName="text-amber-600"
            title="Current work"
            actionLabel="View all"
            onAction={() => router.push(`/workspaces/${workspaceId}/tasks`)}
          >
            {data.tasks.length === 0 ? (
              <Empty icon={CheckSquare2} message="No tasks yet." />
            ) : (
              <div className="space-y-1">
                {data.tasks.map((task) => (
                  <EntityRow
                    key={task.id}
                    icon={getTaskIcon(task.status)}
                    iconClassName={getTaskIconClass(task.status)}
                    title={task.title}
                    meta={formatStatus(task.status)}
                    badge={formatStatus(task.status)}
                    badgeClassName={
                      TASK_STATUS_CLASS[task.status] ??
                      "bg-slate-50 text-slate-500 border-slate-200"
                    }
                    onClick={() =>
                      router.push(`/workspaces/${workspaceId}/tasks/${task.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Snapshot */}
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Snapshot
            </p>
            <div className="mt-4 space-y-3">
              <SnapshotRow
                label="Total items"
                value={String(
                  data.documents.length +
                    data.tasks.length +
                    data.activity.length,
                )}
              />
              <SnapshotRow
                label="Completed tasks"
                value={String(summary.doneTasks)}
              />
              <SnapshotRow
                label="Relationships"
                value={String(data.activity.length)}
              />
              <SnapshotRow
                label="Last document update"
                value={
                  summary.latestDoc
                    ? formatDate(summary.latestDoc.updatedAt)
                    : "None"
                }
              />
            </div>
          </div>

          {/* Activity */}
          <Section
            label="Activity"
            labelClassName="text-fuchsia-600"
            title="Recent relationships"
          >
            {data.activity.length === 0 ? (
              <Empty icon={Activity} message="No relationships yet." />
            ) : (
              <div className="space-y-1">
                {data.activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-100 bg-fuchsia-50">
                      <Activity className="size-3.5 text-fuchsia-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <span className="truncate">{item.sourceLabel}</span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" />
                        <span className="truncate">{item.targetLabel}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatRelationship(item.relationshipType)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  className,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
  className?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("size-3.5 shrink-0 mt-0.5", className)} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  label,
  labelClassName,
  title,
  actionLabel,
  onAction,
  children,
}: {
  label: string;
  labelClassName?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-widest",
              labelClassName ?? "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        {actionLabel && onAction && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function EntityRow({
  icon: Icon,
  iconClassName,
  title,
  meta,
  badge,
  badgeClassName,
  onClick,
}: {
  icon: typeof FileText;
  iconClassName?: string;
  title: string;
  meta: string;
  badge?: string;
  badgeClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
          iconClassName ?? "border-border/60 bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {!badge && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
        )}
      </div>
      {badge && (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
            badgeClassName,
          )}
        >
          {badge}
        </span>
      )}
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
    </button>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Empty({
  icon: Icon,
  message,
}: {
  icon: typeof FileText;
  message: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
      <Icon className="mb-2 size-4 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function getTaskIcon(status: string) {
  if (status === "DONE") return CheckCircle2;
  if (status === "IN_PROGRESS") return TimerReset;
  return CheckSquare2;
}

function getTaskIconClass(status: string) {
  if (status === "DONE")
    return "border-emerald-100 bg-emerald-50 text-emerald-600";
  if (status === "IN_PROGRESS")
    return "border-amber-100 bg-amber-50 text-amber-600";
  return "border-slate-200 bg-slate-50 text-slate-500";
}
