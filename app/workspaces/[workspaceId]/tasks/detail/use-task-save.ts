"use client";

import { useEffect, useRef } from "react";
import type { Block } from "@blocknote/core";

import { extractMentions } from "@/app/_components/editor/editor-utils";
import { toast } from "@/hooks/use-toast";
import type { SaveState } from "@/types";
import type { TaskMetaState } from "./task-constants";

type MetaSaveArgs = {
  meta: TaskMetaState;
  editable: boolean;
  workspaceId: string;
  taskId: string;
  setSaveState: (state: SaveState) => void;
};

export function useTaskMetaSave({
  meta,
  editable,
  workspaceId,
  taskId,
  setSaveState,
}: MetaSaveArgs) {
  const metaSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const metaSaveErrorShownRef = useRef(false);

  useEffect(
    () => () => {
      if (metaSaveTimeoutRef.current) clearTimeout(metaSaveTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (!editable) {
      return;
    }

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
  }, [editable, meta, setSaveState, taskId, workspaceId]);
}

type DescriptionSaveArgs = {
  debouncedContent: Block[] | undefined;
  editable: boolean;
  workspaceId: string;
  taskId: string;
  setSaveState: (state: SaveState) => void;
};

export function useTaskDescriptionSave({
  debouncedContent,
  editable,
  workspaceId,
  taskId,
  setSaveState,
}: DescriptionSaveArgs) {
  const editorSaveErrorShownRef = useRef(false);

  useEffect(() => {
    if (!debouncedContent || !editable) return;
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
  }, [debouncedContent, editable, setSaveState, taskId, workspaceId]);
}
