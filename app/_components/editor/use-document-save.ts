"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/hooks/use-toast";
import type { SaveState } from "@/types";

import {
  formatMemberLabel,
  type DocumentMetaState,
  type WorkspaceMember,
} from "./document-constants";

type UseDocumentSaveArgs = {
  collaborativeMeta: DocumentMetaState;
  members: WorkspaceMember[];
  editable: boolean;
  workspaceId: string;
  documentId: string;
  setSaveState: (state: SaveState) => void;
};

export function useDocumentSave({
  collaborativeMeta,
  members,
  editable,
  workspaceId,
  documentId,
  setSaveState,
}: UseDocumentSaveArgs) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveErrorShownRef = useRef(false);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (!editable) {
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState("saving");
        const authorMember = members.find((m) => m.user.id === collaborativeMeta.authorId);
        const res = await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: collaborativeMeta.title.trim() || "Untitled",
            summary: collaborativeMeta.summary,
            status: collaborativeMeta.status,
            version: collaborativeMeta.version,
            authorId: collaborativeMeta.authorId || undefined,
            authorName: authorMember ? formatMemberLabel(authorMember.user) : undefined,
          }),
        });
        if (!res.ok) throw new Error();
        saveErrorShownRef.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
        if (!saveErrorShownRef.current) {
          saveErrorShownRef.current = true;
          toast({ title: "Document update failed", variant: "destructive" });
        }
      }
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [collaborativeMeta, documentId, editable, members, setSaveState, workspaceId]);
}
