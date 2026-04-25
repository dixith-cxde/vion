"use client";

import type { Block } from "@blocknote/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type EditorContext = {
  entityType: "DOCUMENT" | "TASK";
  entityId: string;
  workspaceId: string;
};

interface EditorProps {
  context: EditorContext;

  initialContent?: Block[];
  editable?: boolean;
  saveState: string;

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

  onChange: (blocks: Block[]) => void;
}

export default function Editor({
  context,
  initialContent,
  editable = true,
  meta,
  onChange,
  saveState,
}: EditorProps) {
  const { entityType, entityId, workspaceId } = context;
  const editor = useCreateBlockNote(
    {
      initialContent: parseInitialContent(initialContent),
    },
    [initialContent],
  );

  const metaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const entityLoadErrorShownRef = useRef(false);
  const metaSaveErrorShownRef = useRef(false);

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
    async function fetchEntities() {
      try {
        if (!workspaceId) return;

        const [tasksRes, docsRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks`),
          fetch(`/api/workspaces/${workspaceId}/documents`),
        ]);

        if (!tasksRes.ok || !docsRes.ok) {
          throw new Error("Failed to load mention entities");
        }

        const tasks = (await tasksRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };
        const docs = (await docsRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };

        entityLoadErrorShownRef.current = false;
        setEntities(normalizeEntities(tasks, docs, { data: [] }));
      } catch (err) {
        console.error("Entity fetch failed", err);
        if (!entityLoadErrorShownRef.current) {
          entityLoadErrorShownRef.current = true;
          toast({
            title: "Mentions unavailable",
            description: "Tasks and documents could not be loaded.",
            variant: "destructive",
          });
        }
      }
    }

    void fetchEntities();
  }, [workspaceId]);

  useEffect(() => {
    return () => {
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
    async (item: MentionEntity) => {
      const cursor = editor.getTextCursorPosition();
      const block = cursor.block;

      const nextContent = replaceMentionTokenInBlock(
        block,
        item,
        mentionQuery,
        workspaceId,
      );

      editor.updateBlock(block, { content: nextContent });
      editor.setTextCursorPosition(block, "end");

      setShowMentions(false);
      setMentionQuery("");

      if (item.type === "USER") {
        return;
      }

      const response = await fetch(
        `/api/workspaces/${workspaceId}/relationships`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceEntityType: entityType,
            sourceEntityId: entityId,
            targetEntityType: item.type,
            targetEntityId: item.id,
            relationshipType: "REFERENCES",
          }),
        },
      );

      if (!response.ok) {
        toast({
          title: "Mention link failed",
          description: "The reference was inserted, but the relationship was not saved.",
          variant: "destructive",
        });
      }
    },
    [editor, entityId, entityType, mentionQuery, workspaceId],
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

    onChange(editor.document);
  };

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
          if (entityType !== "DOCUMENT") return;
          if (!workspaceId) return;

          const response = await fetch(
            `/api/workspaces/${workspaceId}/documents/${entityId}`,
            {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            },
          );
          if (!response.ok) {
            throw new Error("Document meta save failed");
          }
          metaSaveErrorShownRef.current = false;
        } catch (error) {
          console.error("Document meta save failed:", error);
          if (!metaSaveErrorShownRef.current) {
            metaSaveErrorShownRef.current = true;
            toast({
              title: "Document update failed",
              description: "Metadata changes could not be saved.",
              variant: "destructive",
            });
          }
        }
      }, 350);
    },
    [entityId, entityType, workspaceId],
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
          <BlockNoteView
            editor={editor}
            editable={editable}
            theme={lightTheme}
            onChange={handleChange}
            className={cn(
              "vion-blocknote h-full w-full",
              !editable && "pointer-events-none",
            )}
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
