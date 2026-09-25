"use client";

import type { Block } from "@blocknote/core";
import { useEffect, useMemo, useState } from "react";

import { EditorCollaborationProvider } from "./collaboration-context";
import { useCollaborativeMeta } from "./use-collab-meta";
import { CollaborationPresence } from "./collaboration-presence";
import EditorWrapper from "./document-editor-wrapper";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { SaveState } from "@/types";
import { cn } from "@/lib/utils";

import {
  SAVE_STATE_LABEL,
  SAVE_STATE_TEXT,
  formatDate,
  isDocStatus,
  type DocumentMetaState,
  type WorkspaceMember,
} from "./document-constants";
import { useDocumentSave } from "./use-document-save";
import { DocumentProperties } from "./document-properties";

interface EditorProps {
  documentId: string;
  workspaceId: string;
  initialContent?: Block[];
  editable?: boolean;
  meta: {
    title: string;
    status: string;
    version: number;
    summary?: string | null;
    authorId?: string | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export default function DocumentEditor(props: EditorProps) {
  return (
    <EditorCollaborationProvider
      context={{
        entityType: "DOCUMENT",
        entityId: props.documentId,
        workspaceId: props.workspaceId,
      }}
      initialContent={props.initialContent}
      initialMeta={{
        title: props.meta.title,
        summary: props.meta.summary ?? "",
        status: props.meta.status,
        version: props.meta.version,
        authorId: props.meta.authorId ?? "",
      }}
    >
      <Content {...props} />
    </EditorCollaborationProvider>
  );
}

function Content({ documentId, workspaceId, initialContent, meta, editable = true }: EditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const { meta: collaborativeMeta, updateMeta } = useCollaborativeMeta<DocumentMetaState>({
    title: meta.title,
    summary: meta.summary ?? "",
    status: isDocStatus(meta.status) ? meta.status : "DRAFT",
    version: meta.version,
    authorId: meta.authorId ?? "",
  });

  const createdAt = useMemo(() => formatDate(meta.createdAt), [meta.createdAt]);
  const updatedAt = useMemo(() => formatDate(meta.updatedAt), [meta.updatedAt]);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: WorkspaceMember[] };
        setMembers(json.data ?? []);
      } catch {
        /* non-critical */
      }
    }
    void fetchMembers();
  }, [workspaceId]);

  useDocumentSave({
    collaborativeMeta,
    members,
    editable,
    workspaceId,
    documentId,
    setSaveState,
  });

  const selectedAuthor = useMemo(
    () => members.find((m) => m.user.id === collaborativeMeta.authorId) ?? null,
    [members, collaborativeMeta.authorId]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
                "text-[11px] font-medium transition-colors duration-300",
                SAVE_STATE_TEXT[saveState]
              )}
            >
              {SAVE_STATE_LABEL[saveState]}
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="mx-auto w-full h-full overflow-scroll px-8 pb-10 pt-10 bg-white">
            <div className="sticky inset-0 bg-white opacity-100 z-10 pb-5">
              <Input
                value={collaborativeMeta.title}
                onChange={(e) => updateMeta({ title: e.target.value })}
                readOnly={!editable}
                className="h-auto border-0 p-0 !text-5xl font-bold tracking-tight shadow-none focus-visible:ring-0 rounded-none px-1 bg-inherit"
                placeholder="Untitled"
              />
              <Textarea
                value={collaborativeMeta.summary}
                onChange={(e) => updateMeta({ summary: e.target.value })}
                readOnly={!editable}
                rows={1}
                className="mt-3 min-h-0 resize-none border-0 bg-inherit  p-0 text-base leading-relaxed text-muted-foreground shadow-none focus-visible:ring-0"
                placeholder="Add a short summary…"
              />
            </div>

            <Separator className="my-6" />
            <EditorWrapper
              documentId={documentId}
              workspaceId={workspaceId}
              initialContent={initialContent}
              setSaveState={setSaveState}
              editable={editable}
            />
          </div>
        </ScrollArea>
      </div>

      <DocumentProperties
        workspaceId={workspaceId}
        documentId={documentId}
        collaborativeMeta={collaborativeMeta}
        updateMeta={updateMeta}
        members={members}
        selectedAuthor={selectedAuthor}
        createdAt={createdAt}
        updatedAt={updatedAt}
        editable={editable}
      />
    </div>
  );
}
