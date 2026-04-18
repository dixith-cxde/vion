"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useParams } from "next/navigation";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import MentionDropdown from "./mention-dropdown";
import {
  getMentionQueryAtCursor,
  lightTheme,
  normalizeEntities,
  parseInitialContent,
  replaceMentionTokenInBlock,
  type MentionEntity,
} from "./editor-utils";
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
import { cn } from "@/lib/utils";

interface EditorProps {
  documentId: string;
  initialContent?: string;
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

export default function Editor({
  documentId,
  initialContent,
  editable = true,
  meta,
}: EditorProps) {
  const params = useParams<{ workspaceId?: string | string[] }>();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;

  const editor = useCreateBlockNote({
    initialContent: parseInitialContent(initialContent),
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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

          await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error("Document meta save failed:", error);
        }
      }, 350);
    },
    [documentId, workspaceId],
  );

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        if (!workspaceId) return;

        const [tasksRes, docsRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks`),
          fetch(`/api/workspaces/${workspaceId}/documents`),
        ]);

        const tasks = (await tasksRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };
        const docs = (await docsRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };

        setEntities(normalizeEntities(tasks, docs));
      } catch (error) {
        console.error("Entity fetch failed", error);
      }
    };

    void fetchEntities();
  }, [workspaceId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current);
    };
  }, []);

  const filteredEntities = useMemo(() => {
    const normalizedQuery = mentionQuery.trim().toLowerCase();
    if (!normalizedQuery) return entities;
    return entities.filter((entity) =>
      entity.label.toLowerCase().includes(normalizedQuery),
    );
  }, [entities, mentionQuery]);

  const highlightedIndex =
    filteredEntities.length > 0
      ? Math.min(activeIndex, filteredEntities.length - 1)
      : 0;

  const selectMention = useCallback(
    (item: MentionEntity) => {
      const cursorPosition = editor.getTextCursorPosition();
      const currentBlock = cursorPosition.block;
      const nextContent = replaceMentionTokenInBlock(
        currentBlock,
        item,
        mentionQuery,
        workspaceId,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.updateBlock(currentBlock, { content: nextContent as any });
      editor.setTextCursorPosition(currentBlock, "end");

      setShowMentions(false);
      setMentionQuery("");
    },
    [editor, mentionQuery, workspaceId],
  );

  useEffect(() => {
    if (!showMentions) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!filteredEntities.length) {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowMentions(false);
          setMentionQuery("");
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex(
          (currentIndex) => (currentIndex + 1) % filteredEntities.length,
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex(
          (currentIndex) =>
            (currentIndex - 1 + filteredEntities.length) %
            filteredEntities.length,
        );
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        void selectMention(filteredEntities[highlightedIndex]);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setShowMentions(false);
        setMentionQuery("");
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowMentions(false);
        setMentionQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [filteredEntities, highlightedIndex, selectMention, showMentions]);

  const handleChange = () => {
    const currentMentionQuery = getMentionQueryAtCursor();

    if (currentMentionQuery !== null) {
      if (!showMentions || mentionQuery !== currentMentionQuery) {
        setActiveIndex(0);
      }
      setShowMentions(true);
      setMentionQuery(currentMentionQuery);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }

    const content = JSON.stringify(editor.document);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        if (!workspaceId) return;

        await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentJson: content }),
        });
      } catch (error) {
        console.error("Autosave failed:", error);
      }
    }, 800);
  };

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
                className="mt-1 h-auto border-0 bg-transparent px-0 py-0 text-[1.4rem] font-semibold tracking-[-0.04em] text-foreground shadow-none focus-visible:ring-0 md:text-[1.65rem]"
                placeholder="Untitled"
              />
              <Textarea
                value={summary}
                onChange={(event) => handleSummaryChange(event.target.value)}
                rows={1}
                className="mt-1 max-w-3xl min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-sm leading-5 text-muted-foreground shadow-none focus-visible:ring-0"
                placeholder="Add a short summary"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="muted" className="px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
              Document
            </Badge>

            <Badge variant="muted" className="px-2.5 py-1 text-xs font-medium">
              Version: v{meta.version}
            </Badge>

            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-900 dark:bg-emerald-950">
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

            <Separator orientation="vertical" className="hidden self-center md:block" />

            <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium">
              Created: {createdAtLabel}
            </Badge>
            <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium">
              Updated: {updatedAtLabel}
            </Badge>
            </div>

            <div className="inline-flex items-center rounded-full border bg-muted px-2 py-px">
              <Select
                value={status}
                onValueChange={(value) =>
                  handleStatusChange(value as "DRAFT" | "PUBLISHED")
                }
              >
                <SelectTrigger className="h-auto min-h-0 w-auto gap-1 border-0 bg-transparent px-0 py-0 text-[10px] leading-none font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-none focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  <SelectItem value="DRAFT" className="min-h-0 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]">
                    DRAFT
                  </SelectItem>
                  <SelectItem value="PUBLISHED" className="min-h-0 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]">
                    PUBLISHED
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 py-2 md:px-3 md:py-3">
          <BlockNoteView
            editor={editor}
            editable={editable}
            theme={lightTheme}
            onChange={handleChange}
            className={cn("vion-blocknote h-full w-full", !editable && "pointer-events-none")}
            sideMenu={editable}
            slashMenu={editable}
            formattingToolbar={editable}
            linkToolbar={editable}
          />
        </CardContent>
      </Card>

      {showMentions && (
        <MentionDropdown
          ref={dropdownRef}
          activeIndex={highlightedIndex}
          items={filteredEntities}
          onHover={setActiveIndex}
          onSelect={(item) => {
            void selectMention(item);
          }}
        />
      )}
    </div>
  );
}
