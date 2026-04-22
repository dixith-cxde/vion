"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CheckSquare2,
  FileText,
  LoaderCircle,
  TimerReset,
} from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type DashboardData = {
  documents: {
    id: string;
    title: string;
    updatedAt: string;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
  }[];
  activity: {
    id: string;
    sourceLabel: string;
    targetLabel: string;
    relationshipType: string;
  }[];
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
        if (!res.ok) {
          throw new Error("Failed to load workspace overview");
        }

        const json = await res.json();
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
        totalItems: 0,
        doneTasks: 0,
        inProgressTasks: 0,
        latestDocument: null as DashboardData["documents"][number] | null,
      };
    }

    const sortedDocuments = [...data.documents].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return {
      totalItems:
        data.documents.length + data.tasks.length + data.activity.length,
      doneTasks: data.tasks.filter((task) => task.status === "DONE").length,
      inProgressTasks: data.tasks.filter(
        (task) => task.status === "IN_PROGRESS",
      ).length,
      latestDocument: sortedDocuments[0] ?? null,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading workspace overview...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center text-sm text-muted-foreground">
          Workspace overview is unavailable right now.
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <HeroPanel
          workspaceName={activeWorkspace?.name ?? "Workspace"}
          totalItems={summary.totalItems}
          latestDocumentLabel={
            summary.latestDocument
              ? `Latest doc updated ${formatDateTime(summary.latestDocument.updatedAt)}`
              : "No recent document activity yet"
          }
          onOpenDocuments={() =>
            router.push(`/workspaces/${workspaceId}/documents`)
          }
          onOpenTasks={() => router.push(`/workspaces/${workspaceId}/tasks`)}
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Documents"
            value={`${data.documents.length}`}
            hint="Knowledge base and specs"
            icon={FileText}
            toneClassName="text-sky-700"
            iconClassName="border-sky-200/80 bg-sky-50 text-sky-700"
          />
          <MetricCard
            label="Tasks"
            value={`${data.tasks.length}`}
            hint={`${summary.inProgressTasks} currently in progress`}
            icon={TimerReset}
            toneClassName="text-amber-700"
            iconClassName="border-amber-200/80 bg-amber-50 text-amber-700"
          />
          <MetricCard
            label="Completed"
            value={`${summary.doneTasks}`}
            hint="Tasks marked done"
            icon={CheckCircle2}
            toneClassName="text-emerald-700"
            iconClassName="border-emerald-200/80 bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            label="Relationships"
            value={`${data.activity.length}`}
            hint="Recent graph links"
            icon={Activity}
            toneClassName="text-fuchsia-700"
            iconClassName="border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-700"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.95fr)]">
          <div className="grid gap-6">
            <Panel
              eyebrow="Documents"
              eyebrowClassName="text-sky-700"
              title="Recent documents"
              description="The latest workspace pages, notes, and reference material."
              actionLabel="View all"
              onAction={() =>
                router.push(`/workspaces/${workspaceId}/documents`)
              }
            >
              {data.documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents yet"
                  description="Create a document to start collecting specs, notes, and shared knowledge."
                />
              ) : (
                <div className="grid gap-3">
                  {data.documents.map((doc) => (
                    <SurfaceButton
                      key={doc.id}
                      icon={FileText}
                      title={doc.title}
                      description={`Updated ${formatDateTime(doc.updatedAt)}`}
                      badge="Document"
                      badgeClassName="border-sky-200/80 bg-sky-50 text-sky-700"
                      iconClassName="border-sky-200/80 bg-sky-50 text-sky-700"
                      onClick={() =>
                        router.push(
                          `/workspaces/${workspaceId}/documents/${doc.id}`,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              eyebrow="Tasks"
              eyebrowClassName="text-amber-700"
              title="Current work"
              description="Execution items with clearer status treatment and direct navigation."
              actionLabel="View all"
              onAction={() => router.push(`/workspaces/${workspaceId}/tasks`)}
            >
              {data.tasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare2}
                  title="No tasks yet"
                  description="Add a task to track execution, follow-ups, and deliverables."
                />
              ) : (
                <div className="grid gap-3">
                  {data.tasks.map((task) => (
                    <SurfaceButton
                      key={task.id}
                      icon={getTaskIcon(task.status)}
                      title={task.title}
                      description={getTaskDescription(task.status)}
                      badge={formatStatus(task.status)}
                      badgeClassName={getStatusBadgeClassName(task.status)}
                      iconClassName={getTaskIconClassName(task.status)}
                      onClick={() =>
                        router.push(
                          `/workspaces/${workspaceId}/tasks/${task.id}`,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-6">
            <InsightPanel
              workspaceName={activeWorkspace?.name ?? "Workspace"}
              totalItems={summary.totalItems}
              latestDocument={summary.latestDocument}
              doneTasks={summary.doneTasks}
              relationshipCount={data.activity.length}
            />

            <Panel
              eyebrow="Activity"
              eyebrowClassName="text-fuchsia-700"
              title="Recent relationships"
              description="Cross-entity links and graph activity in the workspace."
            >
              {data.activity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="New links and relationships will appear here as the workspace graph evolves."
                />
              ) : (
                <div className="grid gap-3">
                  {data.activity.map((item) => (
                    <ActivityCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPanel({
  workspaceName,
  totalItems,
  latestDocumentLabel,
  onOpenDocuments,
  onOpenTasks,
}: {
  workspaceName: string;
  totalItems: number;
  latestDocumentLabel: string;
  onOpenDocuments: () => void;
  onOpenTasks: () => void;
}) {
  return (
    <section className="border-b border-border/70 pb-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-3">
          <Badge
            variant="muted"
            className="w-fit px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
          >
            Workspace Overview
          </Badge>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {workspaceName} dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Recent documents, current work, and relationship activity in one
              place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>
              {totalItems} tracked item{totalItems === 1 ? "" : "s"}
            </span>
            <div className="inline-flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span>{latestDocumentLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Button
            variant="outline"
            onClick={onOpenDocuments}
            className="justify-start rounded-md"
          >
            <FileText className="size-4" />
            Documents
          </Button>
          <Button
            variant="outline"
            onClick={onOpenTasks}
            className="justify-start rounded-md"
          >
            <CheckSquare2 className="size-4" />
            Tasks
          </Button>
        </div>
      </div>
    </section>
  );
}

function Panel({
  eyebrow,
  eyebrowClassName,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  eyebrow: string;
  eyebrowClassName?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-background p-4 md:p-5">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div
            className={`text-[11px] font-medium uppercase tracking-[0.16em] ${eyebrowClassName ?? "text-muted-foreground"}`}
          >
            {eyebrow}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        {actionLabel && onAction ? (
          <Button variant="outline" className="rounded-md" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>

      <div className="pt-4">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  toneClassName,
  iconClassName,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof FileText;
  toneClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-[11px] uppercase tracking-[0.16em] ${toneClassName ?? "text-muted-foreground"}`}
          >
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
        </div>
        <div
          className={`rounded-md border p-2 ${iconClassName ?? "border-border/70 bg-muted/40 text-muted-foreground"}`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

function SurfaceButton({
  icon: Icon,
  title,
  description,
  badge,
  badgeClassName,
  iconClassName,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  badge: string;
  badgeClassName?: string;
  iconClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-border/70 bg-background px-4 py-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted/20"
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-md border ${iconClassName ?? "border-border/70 bg-muted/30 text-muted-foreground"}`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {title}
        </div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </div>
      </div>

      <Badge
        variant="outline"
        className={`shrink-0 rounded-md text-[10px] uppercase tracking-[0.14em] ${badgeClassName ?? ""}`}
      >
        {badge}
      </Badge>
    </button>
  );
}

function InsightPanel({
  workspaceName,
  totalItems,
  latestDocument,
  doneTasks,
  relationshipCount,
}: {
  workspaceName: string;
  totalItems: number;
  latestDocument: DashboardData["documents"][number] | null;
  doneTasks: number;
  relationshipCount: number;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-muted/10 p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Focus
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {workspaceName} at a glance
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            A compact summary of the workspace without extra decoration.
          </p>
        </div>

        <div className="grid gap-3">
          <InsightRow
            label="Tracked items"
            value={`${totalItems}`}
            note="Combined documents, tasks, and graph activity"
          />
          <InsightRow
            label="Completed tasks"
            value={`${doneTasks}`}
            note="Execution items already finished"
          />
          <InsightRow
            label="Relationships"
            value={`${relationshipCount}`}
            note="Recent graph links recorded in the workspace"
          />
          <InsightRow
            label="Latest document"
            value={
              latestDocument ? formatDate(latestDocument.updatedAt) : "None"
            }
            note={latestDocument?.title ?? "No document updates yet"}
          />
        </div>
      </div>
    </section>
  );
}

function InsightRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-lg font-semibold tracking-tight text-foreground">
          {value}
        </div>
      </div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{note}</div>
    </div>
  );
}

function ActivityCard({ item }: { item: DashboardData["activity"][number] }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30">
          <Activity className="size-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="truncate">{item.sourceLabel}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.targetLabel}</span>
          </div>

          <Badge
            variant="outline"
            className="rounded-md bg-muted/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            {formatRelationship(item.relationshipType)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-md border border-border/70 bg-background">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function getTaskIcon(status: string) {
  if (status === "DONE") return CheckCircle2;
  if (status === "IN_PROGRESS") return TimerReset;
  return CheckSquare2;
}

function getTaskDescription(status: string) {
  if (status === "DONE") return "Completed and ready for follow-through";
  if (status === "IN_PROGRESS") return "Currently moving through execution";
  return "Ready to start";
}

function getTaskIconClassName(status: string) {
  if (status === "DONE") {
    return "border-emerald-200/80 bg-emerald-50 text-emerald-700";
  }

  if (status === "IN_PROGRESS") {
    return "border-amber-200/80 bg-amber-50 text-amber-700";
  }

  return "border-slate-200/80 bg-slate-50 text-slate-700";
}

function getStatusBadgeClassName(status: string) {
  if (status === "DONE") {
    return "border-emerald-200/80 bg-emerald-50 text-emerald-700";
  }

  if (status === "IN_PROGRESS") {
    return "border-amber-200/80 bg-amber-50 text-amber-700";
  }

  return "border-slate-200/80 bg-slate-50 text-slate-700";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatRelationship(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
