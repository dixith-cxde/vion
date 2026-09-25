"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, CheckSquare2, FileText, TimerReset } from "lucide-react";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import GreetingUser from "@/app/_components/ui/greeting-user";
import type { DashboardData } from "./dashboard/dashboard-types";
import { formatDate, formatDateTime, formatRelationship, formatStatus } from "./dashboard/dashboard-format";
import { taskAccent, taskIcon } from "./dashboard/dashboard-theme";
import {
  CompletionCard,
  EmptyState,
  EntityRow,
  RelationshipRow,
  SectionCard,
  SnapshotRow,
  StatCardsGrid,
} from "./dashboard/dashboard-cards";
import type { StatCardItem } from "./dashboard/dashboard-cards";

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
      } catch {
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
      return { doneTasks: 0, inProgressTasks: 0, todoTasks: 0, latestDoc: null as DashboardData["documents"][number] | null, completionRate: 0 };
    }
    const sorted = [...data.documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const done = data.tasks.filter((t) => t.status === "DONE").length;
    const inProg = data.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todo = data.tasks.filter((t) => t.status === "TODO").length;
    const rate = data.tasks.length > 0 ? Math.round((done / data.tasks.length) * 100) : 0;
    return { doneTasks: done, inProgressTasks: inProg, todoTasks: todo, latestDoc: sorted[0] ?? null, completionRate: rate };
  }, [data]);

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

  const statCards: StatCardItem[] = [
    { label: "Documents", value: data.documents.length, icon: FileText, accent: "blue", hint: `${data.documents.length} total`, link: `/workspaces/${workspaceId}/documents` },
    { label: "Tasks", value: data.tasks.length, icon: TimerReset, accent: "amber", hint: `${summary.inProgressTasks} in progress`, link: `/workspaces/${workspaceId}/tasks` },
    { label: "Completed", value: summary.doneTasks, icon: CheckCircle2, accent: "green", hint: `${summary.completionRate}% rate` },
    { label: "Relationships", value: data.activity.length, icon: Activity, accent: "purple", hint: `${data.activity.length} entity links` },
  ];

  return (
    <div className="w-full px-4 py-8 md:px-8 md:py-10 overflow-auto ">
      <div className="mb-8 flex items-start justify-between gap-4">
        <GreetingUser />
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs font-medium" onClick={() => router.push(`/workspaces/${workspaceId}/documents`)}>
            <FileText className="size-3.5" />
            Documents
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs font-medium" onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}>
            <CheckSquare2 className="size-3.5" />
            Tasks
          </Button>
        </div>
      </div>
      <StatCardsGrid cards={statCards} onNavigate={(link) => router.push(link)} />
      {data.tasks.length > 0 && (
        <CompletionCard done={summary.doneTasks} total={data.tasks.length} rate={summary.completionRate} inProgress={summary.inProgressTasks} todo={summary.todoTasks} />
      )}
      <Separator className="mb-8" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <SectionCard accent="blue" sectionLabel="Documents" title="Recent documents" actionLabel="View all" onAction={() => router.push(`/workspaces/${workspaceId}/documents`)} scrollHeightClassName="h-[320px]">
            {data.documents.length === 0 ? (
              <EmptyState icon={FileText} message="No documents yet." />
            ) : (
              <div className="space-y-1.5">
                {data.documents.map((doc) => (
                  <EntityRow key={doc.id} icon={FileText} accent="blue" title={doc.title} meta={`Updated ${formatDateTime(doc.updatedAt)}`} onClick={() => router.push(`/workspaces/${workspaceId}/documents/${doc.id}`)} />
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard accent="amber" sectionLabel="Tasks" title="Current work" actionLabel="View all" onAction={() => router.push(`/workspaces/${workspaceId}/tasks`)} scrollHeightClassName="h-[320px]">
            {data.tasks.length === 0 ? (
              <EmptyState icon={CheckSquare2} message="No tasks yet." />
            ) : (
              <div className="space-y-1.5">
                {data.tasks.map((task) => {
                  const accent = taskAccent(task.status);
                  return <EntityRow key={task.id} icon={taskIcon(task.status)} accent={accent} title={task.title} meta={formatStatus(task.status)} badge={formatStatus(task.status)} badgeAccent={accent} onClick={() => router.push(`/workspaces/${workspaceId}/tasks/${task.id}`)} />;
                })}
              </div>
            )}
          </SectionCard>
        </div>
        <div className="space-y-8">
          <SectionCard accent="green" sectionLabel="Snapshot" title="Workspace overview" scrollHeightClassName="h-[240px]">
            <div className="grid gap-5 sm:grid-cols-2">
              <SnapshotRow label="Total items" value={String(data.documents.length + data.tasks.length + data.activity.length)} />
              <SnapshotRow label="Completed tasks" value={String(summary.doneTasks)} accent="green" />
              <SnapshotRow label="Active relationships" value={String(data.activity.length)} accent="purple" />
              <SnapshotRow label="Last document update" value={summary.latestDoc ? formatDate(summary.latestDoc.updatedAt) : "None"} accent="blue" />
            </div>
          </SectionCard>
          <SectionCard accent="purple" sectionLabel="Activity" title="Recent relationships" scrollHeightClassName="h-[320px]">
            {data.activity.length === 0 ? (
              <EmptyState icon={Activity} message="No relationships yet." />
            ) : (
              <div className="space-y-1">
                {data.activity.map((item) => (
                  <RelationshipRow key={item.id} sourceLabel={item.sourceLabel} targetLabel={item.targetLabel} relationshipType={formatRelationship(item.relationshipType)} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
