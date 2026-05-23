"use client";

import {
  ForwardRefExoticComponent,
  RefAttributes,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare2,
  FileText,
  LucideProps,
  TimerReset,
  Zap,
} from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import GreetingUser from "@/app/_components/ui/greeting-user";
import { cn } from "@/lib/utils";

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

function sectionSurfaceStyle(accent: AccentKey): React.CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, var(--vion-${accent}-bg) 62%, var(--background))`,
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
        console.log({ json });
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

  type TStatCard = {
    label: string;
    value: number;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    accent: AccentKey;
    hint: string;
    link?: string;
  };
  const statCards: TStatCard[] = [
    {
      label: "Documents",
      value: data.documents.length,
      icon: FileText,
      accent: "blue",
      hint: `${data.documents.length} total`,
      link: `/workspaces/${workspaceId}/documents`,
    },
    {
      label: "Tasks",
      value: data.tasks.length,
      icon: TimerReset,
      accent: "amber",
      hint: `${summary.inProgressTasks} in progress`,
      link: `/workspaces/${workspaceId}/tasks`,
    },
    {
      label: "Completed",
      value: summary.doneTasks,
      icon: CheckCircle2,
      accent: "green",
      hint: `${summary.completionRate}% rate`,
    },
    {
      label: "Relationships",
      value: data.activity.length,
      icon: Activity,
      accent: "purple",
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
      <div className="mb-6 grid select-none grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className={cn(
              "group relative overflow-hidden rounded-md border p-4 transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-md",
              "hover:shadow-black/5 dark:hover:shadow-black/30",
              "cursor-pointer"
            )}
            onClick={() => card.link && router.push(card.link)}
            style={{
              background: `var(--vion-${card.accent})`,
              border: `1px solid var(--vion-${card.accent}-border)`,
            }}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-[0.03]",
                "transition-opacity duration-300 group-hover:opacity-[0.06]"
              )}
            >
              <div
                className="h-full w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />
            </div>

            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 45%)",
              }}
            />

            <CardContent className="relative z-10 w-full p-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80"
                    style={textColor(card.accent)}
                  >
                    {card.label}
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <p
                      className={cn(
                        "text-4xl font-black tracking-tight tabular-nums",
                        "transition-all duration-300",
                        "group-hover:scale-[1.02] group-hover:tracking-tighter"
                      )}
                      style={textColor(card.accent)}
                    >
                      {card.value}
                    </p>

                    {card.hint && (
                      <span className="mb-1 truncate text-xs font-medium text-muted-foreground">
                        / {card.hint}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    "transition-all duration-300",
                    "group-hover:scale-110 group-hover:rotate-3"
                  )}
                  style={iconBox(card.accent)}
                >
                  <card.icon className="size-4" />
                </div>
              </div>
            </CardContent>

            <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden">
              <div
                className={cn(
                  "h-full w-1/2 transition-all duration-700",
                  "translate-x-[-120%] group-hover:translate-x-[220%]"
                )}
                style={{
                  background: `linear-gradient(
                    90deg,
                    transparent,
                    var(--vion-${card.accent}-border),
                    transparent
                  )`,
                }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Completion bar */}
      {data.tasks.length > 0 && (
        <Card
          className={cn(
            "group relative mb-6 overflow-hidden rounded-xl border shadow-none",
            "transition-all duration-300",
            "hover:border-white/10 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-[0.025]",
              "transition-opacity duration-300 group-hover:opacity-[0.05]"
            )}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent opacity-70" />

          <CardContent className="relative z-10 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-8 items-center justify-center rounded-md border"
                    style={{
                      background: "var(--vion-amber)",
                      borderColor: "var(--vion-amber-border)",
                    }}
                  >
                    <Zap className="size-4" style={textColor("amber")} />
                  </div>

                  <div>
                    <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                      Task completion
                    </p>

                    <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                      {summary.completionRate}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {summary.doneTasks}
                  <span className="mx-1 text-muted-foreground">/</span>
                  {data.tasks.length}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">completed tasks</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="relative">
                <Progress value={summary.completionRate} className="h-2 rounded-full bg-muted/60" />

                <div
                  className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white/20 blur-sm transition-all duration-500"
                  style={{
                    width: `${summary.completionRate}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <ProgressDot color="var(--vion-green-text)" label={`${summary.doneTasks} done`} />

                <ProgressDot
                  color="var(--vion-amber-text)"
                  label={`${summary.inProgressTasks} in progress`}
                />

                <ProgressDot color="var(--muted-foreground)" label={`${summary.todoTasks} todo`} />
              </div>
            </div>
          </CardContent>

          <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden">
            <div className="h-full w-1/2 translate-x-[-120%] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent transition-all duration-700 group-hover:translate-x-[220%]" />
          </div>
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
            scrollHeightClassName="h-[320px]"
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
            scrollHeightClassName="h-[320px]"
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
          <SectionCard
            accent="green"
            sectionLabel="Snapshot"
            title="Workspace overview"
            scrollHeightClassName="h-[240px]"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <SnapshotRow
                label="Total items"
                value={String(data.documents.length + data.tasks.length + data.activity.length)}
              />
              <SnapshotRow label="Completed tasks" value={String(summary.doneTasks)} accent="green" />
              <SnapshotRow
                label="Active relationships"
                value={String(data.activity.length)}
                accent="purple"
              />
              <SnapshotRow
                label="Last document update"
                value={summary.latestDoc ? formatDate(summary.latestDoc.updatedAt) : "None"}
                accent="blue"
              />
            </div>
          </SectionCard>

          {/* Activity */}
          <SectionCard
            accent="purple"
            sectionLabel="Activity"
            title="Recent relationships"
            scrollHeightClassName="h-[320px]"
          >
            {data.activity.length === 0 ? (
              <EmptyState icon={Activity} message="No relationships yet." />
            ) : (
              <div className="space-y-1">
                {data.activity.map((item) => (
                  <RelationshipRow
                    key={item.id}
                    sourceLabel={item.sourceLabel}
                    targetLabel={item.targetLabel}
                    relationshipType={formatRelationship(item.relationshipType)}
                  />
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
  scrollHeightClassName,
  children,
}: {
  accent: AccentKey;
  sectionLabel: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  scrollHeightClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={textColor(accent)}
          >
            {sectionLabel}
          </p>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {actionLabel && onAction && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={onAction}
          >
            {actionLabel}
            <ArrowUpRight className="size-3" />
          </Button>
        )}
      </div>
      <div
        className="rounded-lg px-4 py-3 md:px-5"
        style={sectionSurfaceStyle(accent)}
      >
        <ScrollArea className={cn("min-h-0 pr-3", scrollHeightClassName ?? "h-[320px]")}>
          <div className="pr-1">{children}</div>
        </ScrollArea>
      </div>
    </section>
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
      className="group flex w-full items-center gap-3 rounded-md border-b border-black/5 px-2 py-3 text-left transition-colors last:border-b-0 hover:bg-background/65 dark:border-white/5 dark:hover:bg-background/20"
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md"
        style={iconBox(accent)}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {badge && badgeAccent && (
        <span
          className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
          style={badgeStyle(badgeAccent)}
        >
          {badge}
        </span>
      )}
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/25 transition-colors group-hover:text-muted-foreground/60" />
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
    <div className="rounded-md bg-background/55 px-3 py-3 dark:bg-background/20">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 text-lg font-semibold tabular-nums tracking-tight"
        style={accent ? textColor(accent) : { color: "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}

function RelationshipRow({
  sourceLabel,
  targetLabel,
  relationshipType,
}: {
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
}) {
  return (
    <div className="rounded-md border-b border-black/5 px-2 py-3 last:border-b-0 dark:border-white/5">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
          style={iconBox("purple")}
        >
          <Activity className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-foreground">
            <span className="font-medium">{sourceLabel}</span>
            <ArrowRight className="size-3 text-muted-foreground/50" />
            <span className="font-medium">{targetLabel}</span>
          </p>
          <p
            className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={textColor("purple")}
          >
            {relationshipType}
          </p>
        </div>
      </div>
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
    <div className="flex min-h-24 items-center gap-3 rounded-md bg-background/55 px-3 text-left dark:bg-background/20">
      <Icon className="size-4 text-muted-foreground/35" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
