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
  TimerReset,
  Zap,
} from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import GreetingUser from "@/app/_components/ui/greeting-user";

// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// VION accent token helpers
// Consume CSS variables from globals.css. Zero dependency on Tailwind color
// utilities — those resolve to achromatic values in this theme.
// ---------------------------------------------------------------------------

type AccentKey = "blue" | "amber" | "green" | "purple";

function iconBox(accent: AccentKey): React.CSSProperties {
  return {
    backgroundColor: `var(--vion-${accent}-bg)`,
    color: `var(--vion-${accent}-text)`,
  };
}

function textColor(accent: AccentKey): React.CSSProperties {
  return { color: `var(--vion-${accent}-text)` };
}

function badgeStyle(accent: AccentKey): React.CSSProperties {
  return {
    backgroundColor: `var(--vion-${accent}-bg)`,
    color: `var(--vion-${accent}-text)`,
    border: `1px solid var(--vion-${accent}-border)`,
  };
}

const STATUS_ACCENT: Record<string, AccentKey> = {
  DONE: "green",
  IN_PROGRESS: "amber",
  TODO: "blue",
};

function taskAccent(status: string): AccentKey {
  return STATUS_ACCENT[status] ?? "blue";
}

function taskIcon(status: string) {
  if (status === "DONE") return CheckCircle2;
  if (status === "IN_PROGRESS") return TimerReset;
  return CheckSquare2;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
    if (!data) {
      return {
        doneTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        latestDoc: null as DashboardData["documents"][number] | null,
        completionRate: 0,
      };
    }
    const sorted = [...data.documents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const done = data.tasks.filter((t) => t.status === "DONE").length;
    const inProg = data.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todo = data.tasks.filter((t) => t.status === "TODO").length;
    const rate = data.tasks.length > 0 ? Math.round((done / data.tasks.length) * 100) : 0;

    return {
      doneTasks: done,
      inProgressTasks: inProg,
      todoTasks: todo,
      latestDoc: sorted[0] ?? null,
      completionRate: rate,
    };
  }, [data]);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full px-4 py-8 md:px-8 md:py-10 space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Workspace overview is unavailable.</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Documents",
      value: data.documents.length,
      icon: FileText,
      accent: "blue" as AccentKey,
      hint: `${data.documents.length} total`,
    },
    {
      label: "Tasks",
      value: data.tasks.length,
      icon: TimerReset,
      accent: "amber" as AccentKey,
      hint: `${summary.inProgressTasks} in progress`,
    },
    {
      label: "Completed",
      value: summary.doneTasks,
      icon: CheckCircle2,
      accent: "green" as AccentKey,
      hint: `${summary.completionRate}% rate`,
    },
    {
      label: "Relationships",
      value: data.activity.length,
      icon: Activity,
      accent: "purple" as AccentKey,
      hint: `${data.activity.length} entity links`,
    },
  ];

  return (
    <div className="w-full px-4 py-8 md:px-8 md:py-10 overflow-auto ">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <GreetingUser />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 text-xs font-medium"
            onClick={() => router.push(`/workspaces/${workspaceId}/documents`)}
          >
            <FileText className="size-3.5" />
            Documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 text-xs font-medium"
            onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}
          >
            <CheckSquare2 className="size-3.5" />
            Tasks
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="rounded-2xl shadow-none"
            style={{ border: `1px solid var(--vion-${card.accent}-border)` }}
          >
            <CardContent className="px-4 py-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={iconBox(card.accent)}
                >
                  <card.icon className="size-3.5" />
                </div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={textColor(card.accent)}
                >
                  {card.label}
                </p>
              </div>
              <p
                className="text-3xl font-bold tracking-tight tabular-nums"
                style={textColor(card.accent)}
              >
                {card.value}
              </p>
              {card.hint && <p className="mt-1 text-[11px] text-muted-foreground">{card.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion bar */}
      {data.tasks.length > 0 && (
        <Card className="mb-6 rounded-2xl border shadow-none">
          <CardContent className="px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Zap className="size-3.5" style={textColor("amber")} />
                Task completion
              </span>
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {summary.doneTasks}/{data.tasks.length}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({summary.completionRate}%)
                </span>
              </span>
            </div>
            <Progress value={summary.completionRate} className="h-1.5" />
            <div className="mt-2.5 flex flex-wrap items-center gap-4">
              <ProgressDot color="var(--vion-green-text)" label={`${summary.doneTasks} done`} />
              <ProgressDot
                color="var(--vion-amber-text)"
                label={`${summary.inProgressTasks} in progress`}
              />
              <ProgressDot color="var(--muted-foreground)" label={`${summary.todoTasks} todo`} />
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="mb-8" />

      {/* Main grid */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-8">
          {/* Documents */}
          <SectionCard
            accent="blue"
            sectionLabel="Documents"
            title="Recent documents"
            actionLabel="View all"
            onAction={() => router.push(`/workspaces/${workspaceId}/documents`)}
          >
            {data.documents.length === 0 ? (
              <EmptyState icon={FileText} message="No documents yet." />
            ) : (
              <div className="space-y-1.5">
                {data.documents.map((doc) => (
                  <EntityRow
                    key={doc.id}
                    icon={FileText}
                    accent="blue"
                    title={doc.title}
                    meta={`Updated ${formatDateTime(doc.updatedAt)}`}
                    onClick={() => router.push(`/workspaces/${workspaceId}/documents/${doc.id}`)}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Tasks */}
          <SectionCard
            accent="amber"
            sectionLabel="Tasks"
            title="Current work"
            actionLabel="View all"
            onAction={() => router.push(`/workspaces/${workspaceId}/tasks`)}
          >
            {data.tasks.length === 0 ? (
              <EmptyState icon={CheckSquare2} message="No tasks yet." />
            ) : (
              <div className="space-y-1.5">
                {data.tasks.map((task) => {
                  const accent = taskAccent(task.status);
                  return (
                    <EntityRow
                      key={task.id}
                      icon={taskIcon(task.status)}
                      accent={accent}
                      title={task.title}
                      meta={formatStatus(task.status)}
                      badge={formatStatus(task.status)}
                      badgeAccent={accent}
                      onClick={() => router.push(`/workspaces/${workspaceId}/tasks/${task.id}`)}
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Snapshot */}
          <Card className="rounded-2xl border shadow-none">
            <CardHeader className="px-5 pt-5 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Snapshot
              </p>
              <CardTitle className="text-base font-semibold tracking-tight">
                Workspace overview
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="divide-y divide-border/60">
                <SnapshotRow
                  label="Total items"
                  value={String(data.documents.length + data.tasks.length + data.activity.length)}
                />
                <SnapshotRow
                  label="Completed tasks"
                  value={String(summary.doneTasks)}
                  accent="green"
                />
                <SnapshotRow
                  label="Active relationships"
                  value={String(data.activity.length)}
                  accent="purple"
                />
                <SnapshotRow
                  label="Last document update"
                  value={summary.latestDoc ? formatDate(summary.latestDoc.updatedAt) : "None"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <SectionCard accent="purple" sectionLabel="Activity" title="Recent relationships">
            {data.activity.length === 0 ? (
              <EmptyState icon={Activity} message="No relationships yet." />
            ) : (
              <div className="space-y-2">
                {data.activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl px-3.5 py-3"
                    style={{ backgroundColor: `var(--vion-purple-bg)` }}
                  >
                    <div
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                      style={iconBox("purple")}
                    >
                      <Activity className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: `var(--vion-purple-border)`,
                            color: `var(--vion-purple-subtle)`,
                          }}
                        >
                          {item.sourceLabel}
                        </span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground/40" />
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: `var(--vion-purple-border)`,
                            color: `var(--vion-purple-subtle)`,
                          }}
                        >
                          {item.targetLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatRelationship(item.relationshipType)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  accent,
  sectionLabel,
  title,
  actionLabel,
  onAction,
  children,
}: {
  accent: AccentKey;
  sectionLabel: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border shadow-none">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <p
              className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest"
              style={textColor(accent)}
            >
              {sectionLabel}
            </p>
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
          </div>
          {actionLabel && onAction && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={onAction}
            >
              {actionLabel}
              <ArrowUpRight className="size-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">{children}</CardContent>
    </Card>
  );
}

function EntityRow({
  icon: Icon,
  accent,
  title,
  meta,
  badge,
  badgeAccent,
  onClick,
}: {
  icon: typeof FileText;
  accent: AccentKey;
  title: string;
  meta: string;
  badge?: string;
  badgeAccent?: AccentKey;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-left transition-all hover:border-border/60 hover:bg-muted/30 hover:shadow-sm"
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={iconBox(accent)}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">{title}</p>
        {!badge && <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>}
      </div>
      {badge && badgeAccent && (
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={badgeStyle(badgeAccent)}
        >
          {badge}
        </span>
      )}
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-muted-foreground/60" />
    </button>
  );
}

function SnapshotRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: AccentKey;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className="text-sm font-semibold tabular-nums"
        style={accent ? textColor(accent) : { color: "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof FileText; message: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
      <Icon className="mb-2 size-4 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
