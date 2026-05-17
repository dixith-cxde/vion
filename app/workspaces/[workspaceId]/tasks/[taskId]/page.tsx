"use client";

import type { Block } from "@blocknote/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";

import {
  EditorCollaborationProvider,
  useCollaborativeMeta,
} from "@/app/_components/editor/collaboration-context";
import { CollaborationPresence } from "@/app/_components/editor/collaboration-presence";
import { extractMentions } from "@/app/_components/editor/editor-utils";
import TaskEditor from "@/app/_components/editor/task-editor";
import { RelationshipsPanel } from "@/app/_components/relationship/relationship-panel";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Task, TaskLifecycle, TaskStatus } from "@/lib/generated/prisma/client";
import { toast } from "@/hooks/use-toast";
import { SaveState } from "@/types";
import { cn } from "@/lib/utils";

const TASK_STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const TASK_LIFECYCLE_OPTIONS: TaskLifecycle[] = [
  "ACTIVE",
  "PLANNED",
  "UPCOMING",
  "DRAFT",
  "ARCHIVED",
];
const TASK_PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type TaskPriority = (typeof TASK_PRIORITY_OPTIONS)[number];

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
const LIFECYCLE_LABEL: Record<TaskLifecycle, string> = {
  ACTIVE: "Active",
  PLANNED: "Planned",
  UPCOMING: "Upcoming",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: "bg-slate-50 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-amber-50 text-amber-600 border-amber-100",
  DONE: "bg-emerald-50 text-emerald-600 border-emerald-100",
};
const PRIORITY_CLASS: Record<TaskPriority, string> = {
  LOW: "bg-sky-50 text-sky-600 border-sky-100",
  MEDIUM: "bg-violet-50 text-violet-600 border-violet-100",
  HIGH: "bg-orange-50 text-orange-600 border-orange-100",
  CRITICAL: "bg-rose-50 text-rose-600 border-rose-100",
};
const LIFECYCLE_CLASS: Record<TaskLifecycle, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
  PLANNED: "bg-blue-50 text-blue-600 border-blue-100",
  UPCOMING: "bg-indigo-50 text-indigo-600 border-indigo-100",
  DRAFT: "bg-zinc-50 text-zinc-500 border-zinc-200",
  ARCHIVED: "bg-stone-50 text-stone-500 border-stone-200",
};
const SAVE_STATE_TEXT: Record<SaveState, string> = {
  idle: "text-muted-foreground/30",
  saving: "text-amber-500 animate-pulse",
  saved: "text-emerald-500",
  error: "text-rose-500",
};
const SAVE_STATE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving",
  saved: "Saved",
  error: "Error",
};

type MemberOption = {
  user: { id: string; name: string | null; email: string | null };
};
type TaskPerson = {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
};
type TaskRecord = Task & {
  assignedToId?: string | null;
  assignedTo?: TaskPerson | null;
  createdBy?: TaskPerson | null;
};
type TaskMetaState = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  lifecycle: TaskLifecycle;
  assignedToId: string | null;
  dueDate: string;
  estimatedAt: string;
};

function normalizePriority(value: string): TaskPriority {
  return TASK_PRIORITY_OPTIONS.includes(value as TaskPriority) ? (value as TaskPriority) : "MEDIUM";
}
function formatMemberLabel(m: { name: string | null; email: string | null }) {
  return m.name ?? m.email ?? "Unknown";
}
function formatDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
function safeParseDescription(value: unknown): Block[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as Block[];
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Block[];
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default function TaskPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [initialEditorContent, setInitialEditorContent] = useState<Block[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [taskRes, memberRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`),
          fetch(`/api/workspaces/${workspaceId}/members`),
        ]);
        if (!taskRes.ok) throw new Error();
        const taskJson = (await taskRes.json()) as { data: TaskRecord };
        setTask(taskJson.data);
        setInitialEditorContent(safeParseDescription(taskJson.data.description));
        if (memberRes.ok) {
          const membersJson = (await memberRes.json()) as {
            data: MemberOption[];
          };
          setMembers(membersJson.data ?? []);
        }
      } catch {
        setLoadError("This task could not be loaded.");
        toast({ title: "Unable to load task", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [taskId, workspaceId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2.5">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading task…</p>
      </div>
    );
  }

  if (!task || loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{loadError ?? "Task could not be loaded."}</p>
      </div>
    );
  }

  return (
    <EditorCollaborationProvider
      context={{ entityType: "TASK", entityId: taskId, workspaceId }}
      initialContent={initialEditorContent}
      initialMeta={{
        title: task.title,
        status: task.status,
        priority: normalizePriority(task.priority),
        lifecycle: task.lifecycle,
        assignedToId: task.assignedToId ?? task.assigneeId,
        dueDate: formatDateInputValue(task.dueDate),
        estimatedAt: typeof task.estimatedAt === "number" ? String(task.estimatedAt) : "",
      }}
    >
      <TaskPageContent
        task={task}
        taskId={taskId}
        workspaceId={workspaceId}
        members={members}
        initialEditorContent={initialEditorContent}
      />
    </EditorCollaborationProvider>
  );
}

function TaskPageContent({
  task,
  taskId,
  workspaceId,
  members,
  initialEditorContent,
}: {
  task: TaskRecord;
  taskId: string;
  workspaceId: string;
  members: MemberOption[];
  initialEditorContent?: Block[];
}) {
  const [editorContent, setEditorContent] = useState<Block[] | undefined>(initialEditorContent);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const metaSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorSaveErrorShownRef = useRef(false);
  const metaSaveErrorShownRef = useRef(false);
  const debouncedContent = useDebounce(editorContent, 1200);

  const { meta, updateMeta } = useCollaborativeMeta<TaskMetaState>({
    title: task.title,
    status: task.status,
    priority: normalizePriority(task.priority),
    lifecycle: task.lifecycle,
    assignedToId: task.assignedToId ?? task.assigneeId,
    dueDate: formatDateInputValue(task.dueDate),
    estimatedAt: typeof task.estimatedAt === "number" ? String(task.estimatedAt) : "",
  });

  const createdAt = useMemo(() => formatDate(task.createdAt), [task.createdAt]);
  const updatedAt = useMemo(() => formatDate(task.updatedAt), [task.updatedAt]);
  const selectedAssignee = useMemo(
    () => members.find((m) => m.user.id === meta.assignedToId) ?? null,
    [members, meta.assignedToId]
  );

  useEffect(
    () => () => {
      if (metaSaveTimeoutRef.current) clearTimeout(metaSaveTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (metaSaveTimeoutRef.current) clearTimeout(metaSaveTimeoutRef.current);
    metaSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState("saving");
        const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: meta.title.trim() || "Untitled task",
            status: meta.status,
            priority: meta.priority,
            lifecycle: meta.lifecycle,
            assignedToId: meta.assignedToId,
            dueDate: meta.dueDate ? new Date(meta.dueDate).toISOString() : null,
            estimatedAt: meta.estimatedAt ? Number(meta.estimatedAt) : null,
          }),
        });
        if (!res.ok) throw new Error();
        metaSaveErrorShownRef.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
        if (!metaSaveErrorShownRef.current) {
          metaSaveErrorShownRef.current = true;
          toast({ title: "Task update failed", variant: "destructive" });
        }
      }
    }, 800);
    return () => {
      if (metaSaveTimeoutRef.current) clearTimeout(metaSaveTimeoutRef.current);
    };
  }, [meta, taskId, workspaceId]);

  useEffect(() => {
    if (!debouncedContent) return;
    const nextContent: Block[] = debouncedContent;
    async function saveDescription() {
      try {
        setSaveState("saving");
        const mentions = extractMentions(nextContent);
        const descRes = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: JSON.stringify(nextContent) }),
        });
        if (!descRes.ok) throw new Error();
        await fetch(`/api/workspaces/${workspaceId}/relationships/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceEntityType: "TASK",
            sourceEntityId: taskId,
            mentions,
          }),
        });
        editorSaveErrorShownRef.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
        if (!editorSaveErrorShownRef.current) {
          editorSaveErrorShownRef.current = true;
          toast({ title: "Task update failed", variant: "destructive" });
        }
      }
    }
    void saveDescription();
  }, [debouncedContent, taskId, workspaceId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-auto bg-background ">
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <CollaborationPresence />
          <span
            className={cn("text-[11px] font-medium transition-colors", SAVE_STATE_TEXT[saveState])}
          >
            {SAVE_STATE_LABEL[saveState]}
          </span>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-8 pb-10 pt-8 md:px-12">
            {/* Title */}
            <Input
              value={meta.title}
              onChange={(e) => updateMeta({ title: e.target.value })}
              className="h-auto border-0 bg-transparent p-0 !text-5xl font-bold tracking-tight shadow-none focus-visible:ring-0"
              placeholder="Untitled task"
            />

            {/* Meta info */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/60">
              <span>Created {createdAt}</span>
              <span className="text-muted-foreground/25">·</span>
              <span>Updated {updatedAt}</span>
              {task.createdBy && (
                <>
                  <span className="text-muted-foreground/25">·</span>
                  <span>By {task.createdBy.name ?? task.createdBy.email ?? "Unknown"}</span>
                </>
              )}
            </div>

            {/* Properties grid */}
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-muted/20 p-4 sm:grid-cols-3">
              <PropCell label="Status">
                <PillSelect
                  value={meta.status}
                  onValueChange={(v) => updateMeta({ status: v as TaskStatus })}
                  className={STATUS_CLASS[meta.status]}
                >
                  {TASK_STATUS_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {STATUS_LABEL[v]}
                    </SelectItem>
                  ))}
                </PillSelect>
              </PropCell>

              <PropCell label="Priority">
                <PillSelect
                  value={meta.priority}
                  onValueChange={(v) => updateMeta({ priority: v as TaskPriority })}
                  className={PRIORITY_CLASS[meta.priority]}
                >
                  {TASK_PRIORITY_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {PRIORITY_LABEL[v]}
                    </SelectItem>
                  ))}
                </PillSelect>
              </PropCell>

              <PropCell label="Lifecycle">
                <PillSelect
                  value={meta.lifecycle}
                  onValueChange={(v) => updateMeta({ lifecycle: v as TaskLifecycle })}
                  className={LIFECYCLE_CLASS[meta.lifecycle]}
                >
                  {TASK_LIFECYCLE_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {LIFECYCLE_LABEL[v]}
                    </SelectItem>
                  ))}
                </PillSelect>
              </PropCell>

              <PropCell label="Assigned to">
                <AssignedToPicker
                  members={members}
                  value={meta.assignedToId}
                  onChange={(v) => updateMeta({ assignedToId: v })}
                  selectedMember={selectedAssignee}
                />
              </PropCell>

              <PropCell label="Due date">
                <div className="flex h-8 w-full items-center rounded-lg border border-fuchsia-100 bg-fuchsia-50 px-3">
                  <Input
                    type="date"
                    value={meta.dueDate}
                    onChange={(e) => updateMeta({ dueDate: e.target.value })}
                    className="h-auto flex-1 border-0 bg-transparent p-0 text-[11px] font-medium text-fuchsia-600 shadow-none focus-visible:ring-0"
                  />
                </div>
              </PropCell>

              <PropCell label="Estimate">
                <div className="flex h-8 w-full items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={meta.estimatedAt}
                    onChange={(e) => updateMeta({ estimatedAt: e.target.value })}
                    className="h-auto flex-1 border-0 bg-transparent p-0 text-[11px] font-semibold text-indigo-600 shadow-none focus-visible:ring-0"
                  />
                  <span className="text-[10px] text-indigo-400">hrs</span>
                </div>
              </PropCell>
            </div>

            <Separator className="my-6" />

            {/* Description editor */}
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Description
            </p>
            <TaskEditor
              key={taskId}
              taskId={taskId}
              workspaceId={workspaceId}
              description={initialEditorContent}
              onChange={setEditorContent}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Right sidebar — relationships only */}
      <aside className="hidden w-72 shrink-0 flex-col border-l bg-background xl:flex">
        <RelationshipsPanel workspaceId={workspaceId} entityType="TASK" entityId={taskId} />
      </aside>
    </div>
  );
}

function PropCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      {children}
    </div>
  );
}

function PillSelect({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-8 w-full rounded-lg border px-3 text-[11px] font-medium shadow-none focus-visible:ring-0",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function AssignedToPicker({
  members,
  value,
  onChange,
  selectedMember,
}: {
  members: MemberOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  selectedMember: MemberOption | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-full justify-between rounded-lg border border-cyan-100 bg-cyan-50 px-3 text-[11px] font-medium text-cyan-700 shadow-none hover:bg-cyan-100 hover:text-cyan-700"
        >
          <span className="truncate">
            {selectedMember ? formatMemberLabel(selectedMember.user) : "Unassigned"}
          </span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              No members found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="unassigned"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="gap-2 text-xs"
              >
                <Check className={cn("size-3.5", !value ? "opacity-100" : "opacity-0")} />
                Unassigned
              </CommandItem>
              {members.map((member) => (
                <CommandItem
                  key={member.user.id}
                  value={formatMemberLabel(member.user)}
                  onSelect={() => {
                    onChange(member.user.id);
                    setOpen(false);
                  }}
                  className="gap-2 text-xs"
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      value === member.user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {formatMemberLabel(member.user)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
