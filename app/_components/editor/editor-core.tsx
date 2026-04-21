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

import { User } from "@/lib/generated/prisma/client";

type EditorContext = {
  entityType: "DOCUMENT" | "TASK";
  entityId: string;
  workspaceId: string;
};

interface EditorProps {
  context: EditorContext;

  initialContent?: Block[];
  editable?: boolean;

  onChange: (blocks: Block[]) => void;
}

export default function EditorCore({
  context,
  initialContent,
  editable = true,
  onChange,
}: EditorProps) {
  const { entityType, entityId, workspaceId } = context;
  const editor = useCreateBlockNote(
    {
      initialContent: parseInitialContent(initialContent),
    },
    [initialContent],
  );

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entities, setEntities] = useState<MentionEntity[]>([]);

  useEffect(() => {
    async function fetchEntities() {
      try {
        if (!workspaceId) return;

        const [tasksRes, docsRes, membersRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks`),
          fetch(`/api/workspaces/${workspaceId}/documents`),
          fetch(`/api/workspaces/${workspaceId}/members`),
        ]);

        const tasks = (await tasksRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };
        const docs = (await docsRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };
        const members = (await membersRes.json()) as {
          data?: Array<User>;
        };

        console.log(members);

        setEntities(normalizeEntities(tasks, docs));
      } catch (err) {
        console.error("Entity fetch failed", err);
      }
    }

    void fetchEntities();
  }, [workspaceId]);

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

      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_entity_type: entityType,
          source_entity_id: entityId,
          target_entity_type: item.type,
          target_entity_id: item.id,
          relationship_type: "MENTIONS",
        }),
      });
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

    onChange(editor.document);
  };

  return (
    <div
      className="relative w-full h-full "
      onMouseDown={(e) => {
        e.preventDefault();

        editor.focus();

        const lastBlock = editor.document[editor.document.length - 1];
        if (lastBlock) {
          editor.setTextCursorPosition(lastBlock, "end");
        }
      }}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={lightTheme}
        onChange={handleChange}
        className="h-full w-full"
        sideMenu={editable}
        slashMenu={editable}
        formattingToolbar={editable}
        linkToolbar={editable}
      />

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
