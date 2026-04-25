"use client";

import type { Block } from "@blocknote/core";
import { useEffect, useMemo, useRef, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import {
  EditorCollaborationProvider,
  useCollaborativeMeta,
} from "./collaboration-context";
import { CollaborationPresence } from "./collaboration-presence";
import EditorWrapper from "./document-editor-wrapper";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { SaveState } from "@/types";
import { cn } from "@/lib/utils";

interface EditorProps {
  documentId: string;
  workspaceId: string;
  initialContent?: Block[];
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

type DocumentMetaState = {
  title: string;
  summary: string;
  status: "DRAFT" | "PUBLISHED";
  version: number;
  authorName: string;
};

function formatStaticDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function DocumentEditor({
  documentId,
  workspaceId,
  initialContent,
  meta,
}: EditorProps) {
  return (
    <EditorCollaborationProvider
      context={{
        entityType: "DOCUMENT",
        entityId: documentId,
        workspaceId,
      }}
      initialContent={initialContent}
      initialMeta={{
        title: meta.title,
        summary: meta.summary ?? "",
        status: meta.status,
        version: meta.version,
        authorName: meta.authorName ?? "",
      }}
    >
      <DocumentEditorContent
        documentId={documentId}
        workspaceId={workspaceId}
        initialContent={initialContent}
        meta={meta}
      />
    </EditorCollaborationProvider>
  );
}

function DocumentEditorContent({
  documentId,
  workspaceId,
  initialContent,
  meta,
}: EditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveErrorShownRef = useRef(false);
  const { meta: collaborativeMeta, updateMeta } =
    useCollaborativeMeta<DocumentMetaState>({
      title: meta.title,
      summary: meta.summary ?? "",
      status: (meta.status as "DRAFT" | "PUBLISHED") ?? "DRAFT",
      version: meta.version,
      authorName: meta.authorName ?? "",
    });

  const createdAtLabel = useMemo(
    () => formatStaticDateLabel(meta.createdAt),
    [meta.createdAt],
  );

  const updatedAtLabel = useMemo(
    () => formatStaticDateLabel(meta.updatedAt),
    [meta.updatedAt],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState("saving");

        const payload = {
          title: collaborativeMeta.title.trim() || "Untitled",
          summary: collaborativeMeta.summary,
          status: collaborativeMeta.status,
          version: collaborativeMeta.version,
          ...(collaborativeMeta.authorName.trim()
            ? { authorName: collaborativeMeta.authorName.trim() }
            : {}),
        };

        const response = await fetch(
          `/api/workspaces/${workspaceId}/documents/${documentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error("Document meta save failed");
        }

        saveErrorShownRef.current = false;
        setSaveState("saved");
      } catch (error) {
        console.error("Document meta save failed:", error);
        setSaveState("error");

        if (!saveErrorShownRef.current) {
          saveErrorShownRef.current = true;
          toast({
            title: "Document update failed",
            description: "Metadata changes could not be saved.",
            variant: "destructive",
          });
        }
      }
    }, 450);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [collaborativeMeta, documentId, workspaceId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="border-b px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <Input
              value={collaborativeMeta.title}
              onChange={(event) => updateMeta({ title: event.target.value })}
              className="h-auto border-0 bg-transparent px-0 text-[2rem] font-semibold tracking-[-0.04em] shadow-none focus-visible:ring-0 md:text-[2.5rem]"
              placeholder="Untitled"
            />
            <Textarea
              value={collaborativeMeta.summary}
              onChange={(event) => updateMeta({ summary: event.target.value })}
              rows={1}
              className="mt-2 min-h-0 max-w-3xl resize-none border-0 bg-transparent px-0 text-sm leading-6 text-muted-foreground shadow-none focus-visible:ring-0"
              placeholder="Add a short summary"
            />
          </div>

          <CollaborationPresence />
        </div>

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
          <Select
            value={collaborativeMeta.status}
            onValueChange={(value) =>
              updateMeta({ status: value as DocumentMetaState["status"] })
            }
          >
            <SelectTrigger
              className={cn(
                "h-9 min-w-32 rounded-full border-0 px-4 text-xs font-medium shadow-none focus-visible:ring-0",
                collaborativeMeta.status === "PUBLISHED"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-zinc-100 text-zinc-700",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex h-9 items-center gap-2 rounded-full bg-violet-50 px-4 text-xs font-medium text-violet-700">
            <span>Version</span>
            <Input
              type="number"
              min="1"
              value={String(collaborativeMeta.version)}
              onChange={(event) =>
                updateMeta({
                  version: Math.max(1, Number(event.target.value) || 1),
                })
              }
              className="h-auto w-12 border-0 bg-transparent p-0 text-xs font-semibold text-violet-700 shadow-none focus-visible:ring-0"
            />
          </label>
          <Badge className="h-9 rounded-full border-0 bg-muted px-4 text-xs font-medium text-muted-foreground">
            Created {createdAtLabel}
          </Badge>
          <Badge className="h-9 rounded-full border-0 bg-muted px-4 text-xs font-medium text-muted-foreground">
            Updated {updatedAtLabel}
          </Badge>
        </div>

        <div className="mt-3 flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <span className="text-xs font-medium">Author</span>
          <Input
            value={collaborativeMeta.authorName}
            onChange={(event) =>
              updateMeta({ authorName: event.target.value })
            }
            className="h-auto max-w-56 border-0 bg-transparent px-0 text-sm font-medium text-emerald-700 shadow-none focus-visible:ring-0"
            placeholder="Unknown"
          />
        </div>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 md:px-4">
        <EditorWrapper
          documentId={documentId}
          workspaceId={workspaceId}
          initialContent={initialContent}
          setSaveState={setSaveState}
        />
      </div>
    </div>
  );
}
