"use client";

import type { Block } from "@blocknote/core";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  EditorCollaborationProvider,
} from "@/app/_components/editor/collaboration-context";
import { useCollaborativeMeta } from "@/app/_components/editor/use-collab-meta";
import { CollaborationPresence } from "@/app/_components/editor/collaboration-presence";
import TaskEditor from "@/app/_components/editor/task-editor";
import { RelationshipsPanel } from "@/app/_components/relationship/relationship-panel";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { SaveState } from "@/types";
import { cn } from "@/lib/utils";
import {
  SAVE_STATE_LABEL,
  SAVE_STATE_TEXT,
  formatDate,
  formatDateInputValue,
  normalizePriority,
  safeParseDescription,
  type MemberOption,
  type TaskMetaState,
  type TaskPermissions,
  type TaskRecord,
} from "../detail/task-constants";
import { TaskProperties } from "../detail/task-properties";
import { useTaskDescriptionSave, useTaskMetaSave } from "../detail/use-task-save";

export default function TaskPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [permissions, setPermissions] = useState<TaskPermissions | null>(null);
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
        const taskJson = (await taskRes.json()) as { data: TaskRecord; permissions?: TaskPermissions };
        setTask(taskJson.data);
        setPermissions(taskJson.permissions ?? null);
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
        permissions={permissions}
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
  permissions,
}: {
  task: TaskRecord;
  taskId: string;
  workspaceId: string;
  members: MemberOption[];
  initialEditorContent?: Block[];
  permissions: TaskPermissions | null;
}) {
  const [editorContent, setEditorContent] = useState<Block[] | undefined>(initialEditorContent);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const debouncedContent = useDebounce(editorContent, 1200);
  const editable = permissions?.canEdit ?? false;

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

  useTaskMetaSave({ meta, editable, workspaceId, taskId, setSaveState });
  useTaskDescriptionSave({ debouncedContent, editable, workspaceId, taskId, setSaveState });

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-auto bg-background ">
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <CollaborationPresence />
          <div className="flex items-center gap-3">
            {!editable ? (
              <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Read only
              </span>
            ) : null}
            <span
              className={cn(
                "text-[11px] font-medium transition-colors",
                SAVE_STATE_TEXT[saveState]
              )}
            >
              {SAVE_STATE_LABEL[saveState]}
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-8 pb-10 pt-8 md:px-12">
            <Input
              value={meta.title}
              onChange={(e) => updateMeta({ title: e.target.value })}
              readOnly={!editable}
              className="h-auto border-0 bg-transparent p-0 !text-5xl font-bold tracking-tight shadow-none focus-visible:ring-0"
              placeholder="Untitled task"
            />

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

            <TaskProperties
              meta={meta}
              updateMeta={updateMeta}
              members={members}
              selectedAssignee={selectedAssignee}
              editable={editable}
            />

            <Separator className="my-6" />

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Description
            </p>
            <TaskEditor
              key={taskId}
              taskId={taskId}
              workspaceId={workspaceId}
              description={initialEditorContent}
              onChange={setEditorContent}
              editable={editable}
            />
          </div>
        </ScrollArea>
      </div>

      <aside className="hidden w-72 shrink-0 flex-col border-l bg-background xl:flex">
        <RelationshipsPanel workspaceId={workspaceId} entityType="TASK" entityId={taskId} />
      </aside>
    </div>
  );
}
