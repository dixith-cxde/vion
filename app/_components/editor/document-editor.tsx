"use client";

import type { Block } from "@blocknote/core";
import { useCallback, useEffect, useRef, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import { type MentionEntity } from "./editor-utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import EditorWrapper from "./document-editor-wrapper";
import { SaveState } from "@/types";

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

export default function DocumentEditor({
  documentId,
  workspaceId,
  initialContent,
  meta,
}: EditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const metaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entities, setEntities] = useState<MentionEntity[]>([]);

  const [title, setTitle] = useState(meta.title);
  const [summary, setSummary] = useState(meta.summary ?? "");
  const [status, setStatus] = useState(meta.status);
  const [authorName, setAuthorName] = useState(meta.authorName ?? "");

  const createdAtLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(meta.createdAt));

  const updatedAtLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(meta.updatedAt));

  useEffect(() => {
    return () => {
      if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current);
    };
  }, []);

  const saveDocumentMeta = useCallback(
    (payload: {
      title?: string;
      summary?: string;
      status?: string;
      authorName?: string;
    }) => {
      if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current);

      metaTimeoutRef.current = setTimeout(async () => {
        try {
          if (!workspaceId) return;

          await fetch(
            `/api/workspaces/${workspaceId}/documents/${documentId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
        } catch (error) {
          console.error("Document meta save failed:", error);
        }
      }, 350);
    },
    [documentId, workspaceId],
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const nextTitle = value.trim();
    if (!nextTitle) return;
    saveDocumentMeta({ title: nextTitle });
  };

  const handleStatusChange = (value: "DRAFT" | "PUBLISHED") => {
    setStatus(value);
    saveDocumentMeta({ status: value });
  };

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    saveDocumentMeta({ summary: value });
  };

  const handleAuthorChange = (value: string) => {
    setAuthorName(value);
    const nextAuthorName = value.trim();
    if (!nextAuthorName) return;
    saveDocumentMeta({ authorName: nextAuthorName });
  };

  return (
    <div className="relative vion-editor-shell w-full">
      <Card className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-none border-0 shadow-none md:rounded-none">
        <CardHeader className="sticky top-0 z-20 gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur md:px-5 md:py-2">
          <div className="flex flex-col gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                className="mt-1 h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[1.4rem] font-semibold tracking-[-0.04em] text-foreground shadow-none focus-visible:ring-0 md:text-[1.65rem]"
                placeholder="Untitled"
              />
              <Textarea
                value={summary}
                onChange={(event) => handleSummaryChange(event.target.value)}
                rows={1}
                className="mt-1 min-h-0 max-w-3xl resize-none rounded-none border-0 bg-transparent px-0 py-0 text-sm leading-5 text-muted-foreground shadow-none focus-visible:ring-0"
                placeholder="Add a short summary"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={
                  saveState === "saving"
                    ? "secondary"
                    : saveState === "error"
                      ? "document"
                      : "outline"
                }
                className=" text-xs font-medium  outline-none border-none px-5 py-2 bg-muted"
              >
                {saveState === "saving" && "Saving..."}
                {saveState === "saved" && "Saved"}
                {saveState === "error" && "Error"}
                {saveState === "idle" && ""}
              </Badge>
              <Badge
                variant="document"
                className=" text-xs font-medium  outline-none border-none px-5 py-2"
              >
                Document
              </Badge>
            </div>

            <div className="inline-flex items-center rounded-full px-2 gap-2">
              <Select
                value={status}
                onValueChange={(value) =>
                  handleStatusChange(value as "DRAFT" | "PUBLISHED")
                }
              >
                <SelectTrigger className="h-auto min-h-0  w-auto gap-1 border-0  px-5 bg-muted py-0 text-[10px] font-medium leading-none uppercase tracking-[0.16em]  shadow-none focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  <SelectItem
                    value="DRAFT"
                    className="min-h-0 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]"
                  >
                    DRAFT
                  </SelectItem>
                  <SelectItem
                    value="PUBLISHED"
                    className="min-h-0 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]"
                  >
                    PUBLISHED
                  </SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="w-2" />
              <Badge
                variant="muted"
                className=" text-xs font-medium  outline-none border-none px-5 py-2"
              >
                Version: v{meta.version}
              </Badge>
              <div className="flex items-center gap-1.5 rounded-full  bg-emerald-50 px-5 py-2 dark:border-emerald-900 dark:bg-emerald-950">
                <Label className="text-xs text-emerald-700 dark:text-emerald-300">
                  Author
                </Label>
                <Input
                  value={authorName}
                  onChange={(event) => handleAuthorChange(event.target.value)}
                  className="h-auto min-w-16 border-0 bg-transparent px-0 py-0 text-xs font-medium text-emerald-700 shadow-none placeholder:text-emerald-400 focus-visible:ring-0 dark:text-emerald-300"
                  placeholder="Unknown"
                />
              </div>
              <Separator orientation="vertical" className="w-2" />

              <Badge
                variant="muted"
                className=" text-xs font-medium bg-muted outline-none border-none px-5 py-2"
              >
                Created: {createdAtLabel}
              </Badge>
              <Badge
                variant="muted"
                className=" text-xs font-medium bg-muted outline-none border-none px-5 py-2"
              >
                Updated: {updatedAtLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 py-2 md:px-3 md:py-3">
          <EditorWrapper
            documentId={documentId}
            workspaceId={workspaceId}
            initialContent={initialContent}
            setSaveState={setSaveState}
          />
        </CardContent>
      </Card>
    </div>
  );
}
