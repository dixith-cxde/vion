"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckSquare2,
  FileText,
  LoaderCircle,
  Sparkles,
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

  const totalItems =
    data.documents.length + data.tasks.length + data.activity.length;

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge
              variant="muted"
              className="w-fit px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
            >
              Workspace Overview
            </Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeWorkspace?.name ?? "Workspace"} dashboard
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Review recent documents, active execution, and relationship
                activity from a single workspace surface.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" />
            <span>
              {totalItems} tracked item{totalItems === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Overview"
            title="Workspace snapshot"
            description="A compact summary of current documents, tasks, and graph activity."
          />
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              label="Documents"
              value={`${data.documents.length}`}
              hint="Knowledge and reference pages"
            />
            <StatCard
              label="Tasks"
              value={`${data.tasks.length}`}
              hint="Tracked work items"
            />
            <StatCard
              label="Activity"
              value={`${data.activity.length}`}
              hint="Recent graph connections"
            />
            <StatCard
              label="Total tracked"
              value={`${totalItems}`}
              hint="Combined visible workspace items"
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3 border-b pb-4">
              <SectionHeader
                eyebrow="Documents"
                title="Recent docs"
                description="The latest notes and reference pages touched in this workspace."
              />
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => router.push(`/workspaces/${workspaceId}/documents`)}
              >
                View all
              </Button>
            </div>
            {data.documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Create a document to start collecting specs, notes, and shared knowledge."
              />
            ) : (
              <SectionList>
                {data.documents.map((doc) => (
                  <ListButton
                    key={doc.id}
                    icon={FileText}
                    title={doc.title}
                    meta={`Updated ${formatDateTime(doc.updatedAt)}`}
                    badge="Open"
                    onClick={() =>
                      router.push(`/workspaces/${workspaceId}/documents/${doc.id}`)
                    }
                  />
                ))}
              </SectionList>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3 border-b pb-4">
              <SectionHeader
                eyebrow="Tasks"
                title="Current work"
                description="Visible execution items and their current status."
              />
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}
              >
                View all
              </Button>
            </div>
            {data.tasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare2}
                title="No tasks yet"
                description="Add a task to track execution, follow-ups, and deliverables."
              />
            ) : (
              <SectionList>
                {data.tasks.map((task) => (
                  <ListRow
                    key={task.id}
                    icon={CheckSquare2}
                    title={task.title}
                    meta="Current execution status"
                    badge={formatStatus(task.status)}
                  />
                ))}
              </SectionList>
            )}
          </section>

          <section className="space-y-4">
            <div className="border-b pb-4">
              <SectionHeader
                eyebrow="Activity"
                title="Recent relationships"
                description="The latest graph links and cross-entity connections."
              />
            </div>
            {data.activity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="New links and relationships will appear here as the workspace graph evolves."
              />
            ) : (
              <SectionList>
                {data.activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Activity className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="truncate">{item.sourceLabel}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.targetLabel}</span>
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {item.relationshipType}
                      </div>
                    </div>
                  </div>
                ))}
              </SectionList>
            )}
          </section>
        </div>
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

function SectionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70">
      {children}
    </div>
  );
}

function ListButton({
  icon: Icon,
  title,
  meta,
  badge,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  meta: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/35"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 rounded-lg text-[10px] uppercase tracking-[0.14em]"
      >
        {badge}
      </Badge>
    </button>
  );
}

function ListRow({
  icon: Icon,
  title,
  meta,
  badge,
}: {
  icon: typeof CheckSquare2;
  title: string;
  meta: string;
  badge: string;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 rounded-lg text-[10px] uppercase tracking-[0.14em]"
      >
        {badge}
      </Badge>
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
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
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
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (char) =>
    char.toUpperCase(),
  );
}
