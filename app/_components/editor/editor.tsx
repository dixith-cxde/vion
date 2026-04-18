"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "next-themes";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import MentionDropdown from "./mention-dropdown";
import {
  darkTheme,
  getMentionQueryAtCursor,
  lightTheme,
  normalizeEntities,
  parseInitialContent,
  replaceMentionTokenInBlock,
  type MentionEntity,
} from "./editor-utils";

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
          await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error("Document meta save failed:", error);
        }
      }, 350);
    },
    [documentId],
  );

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [tasksRes, docsRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/documents"),
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
  }, []);

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
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.updateBlock(currentBlock, { content: nextContent as any });
      editor.setTextCursorPosition(currentBlock, "end");

      setShowMentions(false);
      setMentionQuery("");
    },
    [editor, mentionQuery],
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
        await fetch(`/api/documents/${documentId}`, {
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
      <div className="flex h-screen max-h-screen flex-col overflow-hidden border border-[#e7eaf2] bg-[#fcfcfe] shadow-[0_28px_80px_rgba(28,32,48,0.09)]">
        <div className="sticky top-0 z-20 border-b border-[#eceff6] bg-[#fcfcfe]/95 px-4 py-4 backdrop-blur md:px-6 md:py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9aa1b2]">
                Document
              </p>
              <input
                type="text"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                className="mt-2 w-full truncate bg-transparent text-[2rem] font-semibold tracking-[-0.05em] text-[#171821] outline-none placeholder:text-[#b0b6c4] md:text-[2.35rem]"
                placeholder="Untitled"
              />
              <textarea
                value={summary}
                onChange={(event) => handleSummaryChange(event.target.value)}
                rows={2}
                className="mt-3 w-full max-w-3xl resize-none border-0 bg-transparent px-0 text-sm leading-6 text-[#707789] outline-none placeholder:text-[#b0b6c4]"
                placeholder="Add a short summary"
              />
            </div>

            <div className="rounded-full border border-[#e8ebf2] bg-white px-3 py-1.5 text-xs font-medium text-[#5f6574]">
              `/` commands
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <label className="rounded-full border border-[#e7ebf3] bg-[#f4f7fb] px-3 py-1.5 text-xs font-medium text-[#586072]">
              <span className="mr-2">Status:</span>
              <select
                value={status}
                onChange={(event) =>
                  handleStatusChange(
                    event.target.value as "DRAFT" | "PUBLISHED",
                  )
                }
                className="bg-transparent font-medium outline-none"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
              </select>
            </label>
            <div className="rounded-full border border-[#e7ebf3] bg-[#f4f7fb] px-3 py-1.5 text-xs font-medium text-[#586072]">
              Version: v{meta.version}
            </div>
            <label className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="mr-2">Author:</span>
              <input
                type="text"
                value={authorName}
                onChange={(event) => handleAuthorChange(event.target.value)}
                className="min-w-20 bg-transparent font-medium outline-none placeholder:text-emerald-400"
                placeholder="Unknown"
              />
            </label>
            <div className="rounded-full border border-[#e7ebf3] bg-white px-3 py-1.5 text-xs font-medium text-[#586072]">
              Created: {createdAtLabel}
            </div>
            <div className="rounded-full border border-[#e7ebf3] bg-white px-3 py-1.5 text-xs font-medium text-[#586072]">
              Updated: {updatedAtLabel}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 md:px-3 md:py-3">
          <BlockNoteView
            editor={editor}
            editable={editable}
            theme={isDark ? darkTheme : lightTheme}
            onChange={handleChange}
            className="vion-blocknote h-full w-full"
            sideMenu={editable}
            slashMenu={editable}
            formattingToolbar={editable}
            linkToolbar={editable}
          />
        </div>
      </div>

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
