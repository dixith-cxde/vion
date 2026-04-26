"use client";

import type { Block } from "@blocknote/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  EditorCollaborationProvider,
  useCollaborativeMeta,
} from "@/app/_components/editor/collaboration-context";
import { CollaborationPresence } from "@/app/_components/editor/collaboration-presence";
import { extractMentions } from "@/app/_components/editor/editor-utils";
import TaskEditor from "@/app/_components/editor/task-editor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type {
  Task,
  TaskLifecycle,
  TaskStatus,
} from "@/lib/generated/prisma/client";
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

const STATUS_TINT: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  DONE: "bg-emerald-50 text-emerald-700",
};

const PRIORITY_TINT: Record<TaskPriority, string> = {
  LOW: "bg-sky-50 text-sky-700",
  MEDIUM: "bg-violet-50 text-violet-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-rose-50 text-rose-700",
};

const LIFECYCLE_TINT: Record<TaskLifecycle, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PLANNED: "bg-blue-50 text-blue-700",
  UPCOMING: "bg-indigo-50 text-indigo-700",
  DRAFT: "bg-zinc-100 text-zinc-700",
  ARCHIVED: "bg-stone-100 text-stone-700",
};

function formatStaticDateLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function TaskPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [initialEditorContent, setInitialEditorContent] = useState<
    Block[] | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null);

        const [taskRes, memberRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`),
          fetch(`/api/workspaces/${workspaceId}/members`),
        ]);

        if (!taskRes.ok) {
          toast({ title: "Failed to load tasks" });
          throw new Error("Failed to load task");
        }

        const taskJson = await taskRes.json();
        setTask(taskJson.data);
        setInitialEditorContent(
          safeParseDescription(taskJson.data.description),
        );

        if (memberRes.ok) {
          const membersJson = await memberRes.json();
          setMembers(membersJson.data ?? []);
        }
      } catch (error) {
        console.error("Failed to load task:", error);
        setLoadError("This task could not be loaded.");
        toast({
          title: "Unable to load task",
          description: "Refresh the page and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [taskId, workspaceId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <p>Loading Task...</p>
      </div>
    );
  }

  if (!task || loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-sm text-muted-foreground">
          {loadError ?? "This task could not be loaded."}
        </div>
      </div>
    );
  }

  return (
    <EditorCollaborationProvider
      context={{
        entityType: "TASK",
        entityId: taskId,
        workspaceId,
      }}
      initialContent={initialEditorContent}
      initialMeta={{
        title: task.title,
        status: task.status,
        priority: normalizePriority(task.priority),
        lifecycle: task.lifecycle,
        assignedToId: task.assignedToId ?? task.assigneeId,
        dueDate: formatDateInputValue(task.dueDate),
        estimatedAt:
          typeof task.estimatedAt === "number" ? String(task.estimatedAt) : "",
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
  const [editorContent, setEditorContent] = useState<Block[] | undefined>(
    initialEditorContent,
  );
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
    estimatedAt:
      typeof task.estimatedAt === "number" ? String(task.estimatedAt) : "",
  });

  const createdAtLabel = useMemo(
    () => formatStaticDateLabel(task.createdAt),
    [task.createdAt],
  );
  const updatedAtLabel = useMemo(
    () => formatStaticDateLabel(task.updatedAt),
    [task.updatedAt],
  );

  useEffect(() => {
    return () => {
      if (metaSaveTimeoutRef.current) {
        clearTimeout(metaSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (metaSaveTimeoutRef.current) {
      clearTimeout(metaSaveTimeoutRef.current);
    }

    metaSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState("saving");

        const payload = {
          title: meta.title.trim() || "Untitled task",
          status: meta.status,
          priority: meta.priority,
          lifecycle: meta.lifecycle,
          assignedToId: meta.assignedToId,
          dueDate: meta.dueDate ? new Date(meta.dueDate).toISOString() : null,
          estimatedAt: meta.estimatedAt ? Number(meta.estimatedAt) : null,
        };

        const response = await fetch(
          `/api/workspaces/${workspaceId}/tasks/${taskId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error("Task meta save failed");
        }

        metaSaveErrorShownRef.current = false;
        setSaveState("saved");
      } catch (error) {
        console.error("Task meta save failed:", error);
        setSaveState("error");

        if (!metaSaveErrorShownRef.current) {
          metaSaveErrorShownRef.current = true;
          toast({
            title: "Task update failed",
            description: "Metadata changes could not be saved.",
            variant: "destructive",
          });
        }
      }
    }, 450);

    return () => {
      if (metaSaveTimeoutRef.current) {
        clearTimeout(metaSaveTimeoutRef.current);
      }
    };
  }, [meta, taskId, workspaceId]);

  useEffect(() => {
    const content = debouncedContent;

    if (!content) {
      return;
    }

    const nextContent: Block[] = content;

    async function saveDescription() {
      try {
        setSaveState("saving");
        const mentions = extractMentions(nextContent);

        const response = await fetch(
          `/api/workspaces/${workspaceId}/tasks/${taskId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: JSON.stringify(nextContent),
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Task description save failed");
        }

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
      } catch (error) {
        console.error("Task description save failed:", error);
        setSaveState("error");

        if (!editorSaveErrorShownRef.current) {
          editorSaveErrorShownRef.current = true;
          toast({
            title: "Task update failed",
            description: "Your latest changes could not be saved.",
            variant: "destructive",
          });
        }
      }
    }

    void saveDescription();
  }, [debouncedContent, taskId, workspaceId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="border-b px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <Input
              value={meta.title}
              onChange={(event) => updateMeta({ title: event.target.value })}
              className="h-auto border-0 bg-transparent px-0 text-[2rem] font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-[2.5rem]"
              placeholder="Untitled task"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Badge
                variant="outline"
                className={cn(
                  "h-9 rounded-full border-0 px-4 text-xs font-medium",
                  saveState === "saving" && "bg-amber-50 text-amber-700",
                  saveState === "saved" && "bg-emerald-50 text-emerald-700",
                  saveState === "error" && "bg-rose-50 text-rose-700",
                )}
              >
                {saveState === "saving"
                  ? "Saving..."
                  : saveState === "error"
                    ? "Error"
                    : "Saved"}
              </Badge>
              <Badge className="h-9 rounded-full border-0 bg-muted px-4 text-xs font-medium text-muted-foreground">
                Created {createdAtLabel}
              </Badge>
              <Badge className="h-9 rounded-full border-0 bg-muted px-4 text-xs font-medium text-muted-foreground">
                Created by {formatPersonLabel(task.createdBy)}
              </Badge>
              <Badge className="h-9 rounded-full border-0 bg-muted px-4 text-xs font-medium text-muted-foreground">
                Updated {updatedAtLabel}
              </Badge>
            </div>
          </div>

          <CollaborationPresence />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <TaskSelect
            value={meta.status}
            onValueChange={(value) =>
              updateMeta({ status: value as TaskStatus })
            }
            triggerClassName={STATUS_TINT[meta.status]}
          >
            {TASK_STATUS_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABEL[value]}
              </SelectItem>
            ))}
          </TaskSelect>

          <TaskSelect
            value={meta.priority}
            onValueChange={(value) =>
              updateMeta({ priority: value as TaskPriority })
            }
            triggerClassName={PRIORITY_TINT[meta.priority]}
          >
            {TASK_PRIORITY_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {PRIORITY_LABEL[value]}
              </SelectItem>
            ))}
          </TaskSelect>

          <TaskSelect
            value={meta.lifecycle}
            onValueChange={(value) =>
              updateMeta({ lifecycle: value as TaskLifecycle })
            }
            triggerClassName={LIFECYCLE_TINT[meta.lifecycle]}
          >
            {TASK_LIFECYCLE_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {LIFECYCLE_LABEL[value]}
              </SelectItem>
            ))}
          </TaskSelect>

          <AssignedToPicker
            members={members}
            value={meta.assignedToId}
            onChange={(value) => updateMeta({ assignedToId: value })}
          />

          <MetaInput
            label="Due"
            type="date"
            value={meta.dueDate}
            onChange={(event) => updateMeta({ dueDate: event.target.value })}
            className="bg-fuchsia-50 text-fuchsia-700"
          />

          <MetaInput
            label="Estimate"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Hours"
            value={meta.estimatedAt}
            onChange={(event) =>
              updateMeta({ estimatedAt: event.target.value })
            }
            className="bg-indigo-50 text-indigo-700"
          />
        </div>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 md:px-4">
        <TaskEditor
          key={taskId}
          taskId={taskId}
          workspaceId={workspaceId}
          description={initialEditorContent}
          onChange={setEditorContent}
        />
      </div>
    </div>
  );
}

function TaskSelect({
  value,
  onValueChange,
  children,
  placeholder,
  triggerClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  triggerClassName?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-9 min-w-[8.5rem] rounded-full border-0 px-4 text-xs font-medium shadow-none focus-visible:ring-0",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function MetaInput({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium",
        className,
      )}
    >
      <span>{label}</span>
      <Input
        {...props}
        className="h-auto w-auto min-w-[5rem] border-0 bg-transparent p-0 text-xs font-semibold shadow-none focus-visible:ring-0"
      />
    </label>
  );
}

function AssignedToPicker({
  members,
  value,
  onChange,
}: {
  members: MemberOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedMember = useMemo(
    () => members.find((member) => member.user.id === value) ?? null,
    [members, value],
  );

  useEffect(() => {
    setQuery("");
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return members;
    }

    return members.filter((member) =>
      formatMemberLabel(member.user).toLowerCase().includes(normalizedQuery),
    );
  }, [members, query]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-9 min-w-[12rem] items-center rounded-full border-0 bg-cyan-50 px-4 text-xs font-medium text-cyan-700 shadow-none"
      >
        Assigned to:{" "}
        {selectedMember ? formatMemberLabel(selectedMember.user) : "Unassigned"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-11 z-30 w-72 rounded-2xl border bg-background p-2 shadow-xl">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workspace members"
            className="h-9 rounded-xl border bg-background px-3 text-xs"
            autoFocus
          />

          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span>Unassigned</span>
              {!value ? (
                <span className="text-xs text-muted-foreground">Selected</span>
              ) : null}
            </button>

            {filteredMembers.map((member) => (
              <button
                key={member.user.id}
                type="button"
                onClick={() => {
                  onChange(member.user.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{formatMemberLabel(member.user)}</span>
                {value === member.user.id ? (
                  <span className="text-xs text-muted-foreground">
                    Selected
                  </span>
                ) : null}
              </button>
            ))}

            {filteredMembers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matching workspace members
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizePriority(value: string): TaskPriority {
  return TASK_PRIORITY_OPTIONS.includes(value as TaskPriority)
    ? (value as TaskPriority)
    : "MEDIUM";
}

function formatMemberLabel(member: {
  name: string | null;
  email: string | null;
}) {
  return member.name || member.email || "Unknown member";
}

function formatPersonLabel(person?: TaskPerson | null) {
  if (!person?.name) {
    return "Unknown";
  }

  return formatMemberLabel(person);
}

function formatDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function safeParseDescription(value: unknown) {
  if (!value) return undefined;

  if (typeof value === "object" && Array.isArray(value)) {
    return value as Block[];
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Block[];
    } catch {
      console.warn("Invalid JSON description:", value);
    }
  }

  return undefined;
}
