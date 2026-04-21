"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckSquare2,
  FileText,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

type SectionCardProps = {
  title: string;
  description: string;
  badgeLabel: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
};

function SectionCard({
  title,
  description,
  badgeLabel,
  icon: Icon,
  children,
}: SectionCardProps) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-1.5">
              <Icon className="size-3 text-muted-foreground" />
            </div>
            <CardTitle className="text-sm leading-none">{title}</CardTitle>
          </div>
          <Badge
            variant="outline"
            className="h-5 px-2 text-[9px] uppercase tracking-[0.12em]"
          >
            {badgeLabel}
          </Badge>
        </div>
        <CardDescription className="line-clamp-1 text-[11px] leading-4">
          {description}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="px-4 py-4">{children}</CardContent>
    </Card>
  );
}

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
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [workspaceId]);

  if (loading || !data) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center text-sm text-muted-foreground">
          Loading workspace overview...
        </div>
      </div>
    );
  }

  const totalItems =
    data.documents.length + data.tasks.length + data.activity.length;

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <Badge
              variant="muted"
              className="w-fit px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
            >
              Workspace Overview
            </Badge>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {activeWorkspace?.name ?? "Workspace"} dashboard
              </h1>
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground md:text-sm">
                Review recent documents, active tasks, and graph activity for
                this workspace in one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
            <Sparkles className="size-3.5" />
            <span>
              {totalItems} tracked item{totalItems === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard
            title="Documents"
            description="Recently updated notes and reference material."
            badgeLabel={`${data.documents.length} item${
              data.documents.length === 1 ? "" : "s"
            }`}
            icon={FileText}
          >
            {data.documents.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center px-4 py-6 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold">No documents yet</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Create a document to start collecting specs, notes, and shared
                  knowledge.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/workspaces/${workspaceId}/documents/${doc.id}`,
                      )
                    }
                    className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 text-left shadow-none transition-colors hover:border-foreground/15 hover:bg-muted/30"
                  >
                    <div className="rounded-lg bg-muted p-2">
                      <FileText className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium leading-5">
                        {doc.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Updated {new Date(doc.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] uppercase tracking-[0.14em]"
                    >
                      Open
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Tasks"
            description="Current work items and their latest status."
            badgeLabel={`${data.tasks.length} item${
              data.tasks.length === 1 ? "" : "s"
            }`}
            icon={CheckSquare2}
          >
            {data.tasks.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center px-4 py-6 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <CheckSquare2 className="size-5 text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold">No tasks yet</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Add a task to track execution, follow-ups, and deliverables.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 shadow-none transition-colors hover:border-foreground/15 hover:bg-muted/30"
                  >
                    <div className="rounded-lg bg-muted p-2">
                      <CheckSquare2 className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-5">
                        {task.title}
                      </span>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Current execution status
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] uppercase tracking-[0.14em]"
                    >
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Activity"
            description="Recent relationships and graph connections."
            badgeLabel={`${data.activity.length} item${
              data.activity.length === 1 ? "" : "s"
            }`}
            icon={Activity}
          >
            {data.activity.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center px-4 py-6 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Activity className="size-5 text-muted-foreground" />
                </div>
                <h2 className="text-sm font-semibold">No activity yet</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  New links and relationships will appear here as the workspace
                  graph evolves.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 shadow-none transition-colors hover:border-foreground/15 hover:bg-muted/30"
                  >
                    <div className="rounded-lg bg-muted p-2">
                      <Activity className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium leading-5">
                        <span className="truncate">{item.sourceLabel}</span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.targetLabel}</span>
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {item.relationshipType}
                      </div>
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
