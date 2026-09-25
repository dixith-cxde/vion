"use client";

import { useCallback, useEffect, type RefObject } from "react";
import type { BlockNoteEditor } from "@blocknote/core";

import { replaceMentionTokenInBlock, type MentionEntity } from "./editor-utils";
import { toast } from "@/hooks/use-toast";

type UseMentionSelectArgs = {
  editor: BlockNoteEditor;
  entityId: string;
  entityType: "DOCUMENT" | "TASK";
  mentionQuery: string;
  workspaceId: string;
  setMentionQuery: (value: string) => void;
  setShowMentions: (value: boolean) => void;
};

export function useMentionSelect({
  editor,
  entityId,
  entityType,
  mentionQuery,
  workspaceId,
  setMentionQuery,
  setShowMentions,
}: UseMentionSelectArgs) {
  const selectMention = useCallback(
    async (item: MentionEntity) => {
      const cursor = editor.getTextCursorPosition();
      const block = cursor.block;

      const nextContent = replaceMentionTokenInBlock(block, item, mentionQuery, workspaceId);

      editor.updateBlock(block, { content: nextContent });
      editor.setTextCursorPosition(block, "end");

      setShowMentions(false);
      setMentionQuery("");

      if (item.type === "USER") return;

      const response = await fetch(`/api/workspaces/${workspaceId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityType: entityType,
          sourceEntityId: entityId,
          targetEntityType: item.type,
          targetEntityId: item.entityId,
          relationshipType: "REFERENCES",
        }),
      });

      if (!response.ok) {
        toast({
          title: "Mention link failed",
          description: "The reference was inserted, but the relationship was not saved.",
          variant: "destructive",
        });
      }
    },
    [editor, entityId, entityType, mentionQuery, setMentionQuery, setShowMentions, workspaceId]
  );

  return selectMention;
}

type UseMentionKeysArgs = UseMentionSelectArgs & {
  dropdownRef: RefObject<HTMLDivElement | null>;
  filteredEntities: MentionEntity[];
  highlightedIndex: number;
  showMentions: boolean;
  selectMention: (item: MentionEntity) => void;
  setActiveIndex: (update: (index: number) => number) => void;
};

export function useMentionKeys({
  dropdownRef,
  filteredEntities,
  highlightedIndex,
  showMentions,
  selectMention,
  setActiveIndex,
  setMentionQuery,
  setShowMentions,
}: UseMentionKeysArgs) {
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
        setActiveIndex((i) => (i + 1) % filteredEntities.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex((i) => (i - 1 + filteredEntities.length) % filteredEntities.length);
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
      if (target && dropdownRef.current && !dropdownRef.current.contains(target)) {
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
  }, [
    dropdownRef,
    filteredEntities,
    highlightedIndex,
    selectMention,
    setActiveIndex,
    setMentionQuery,
    setShowMentions,
    showMentions,
  ]);
}
