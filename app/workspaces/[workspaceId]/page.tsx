"use client";

import { useEffect, useState } from "react";
import { FileText, CheckSquare2, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
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

export default function WorkspaceDashboard() {
  const { activeWorkspace } = useWorkspace();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!cancelled) {
        setLoading(true);
      }

      if (!activeWorkspace) {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/workspaces/${activeWorkspace.id}/dashboard`,
        );
        const json = (await response.json()) as DashboardData;

        if (!cancelled) {
          setData(json);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center text-sm text-muted-foreground">
          Loading workspace overview...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center text-sm text-muted-foreground">
          Failed to load workspace overview.
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="muted" className="w-fit uppercase tracking-[0.16em]">
              Workspace Overview
            </Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeWorkspace?.name ?? "Workspace"} dashboard
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Recent documents, task momentum, and relationship activity across
                this workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 rounded-full px-4">
              <Link href={`/workspaces/${activeWorkspace?.id}/documents`}>
                Documents
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-full px-4">
              <Link href={`/workspaces/${activeWorkspace?.id}/tasks`}>
                Tasks
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-muted p-2.5">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">
                  {data.documents.length}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">Recent Documents</CardTitle>
                <CardDescription>Latest writing activity in this workspace</CardDescription>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {data.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="space-y-1">
                      <div className="text-sm font-medium">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(doc.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-muted p-2.5">
                  <CheckSquare2 className="size-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">
                  {data.tasks.length}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">Recent Tasks</CardTitle>
                <CardDescription>Items that changed most recently</CardDescription>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {data.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.tasks.map((task) => (
                    <div key={task.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{task.title}</div>
                      </div>
                      <Badge variant="muted" className="shrink-0 text-[10px] uppercase tracking-[0.14em]">
                        {task.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-muted p-2.5">
                  <Activity className="size-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">
                  {data.activity.length}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">Activity</CardTitle>
                <CardDescription>Recent relationship events across entities</CardDescription>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.activity.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{item.sourceLabel}</span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.targetLabel}</span>
                      </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {item.relationshipType}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
