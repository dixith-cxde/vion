"use client";

import type { Block } from "@blocknote/core";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "./editor.css";

import MentionDropdown from "./mention-dropdown";
import { useEditorCollaboration } from "./collaboration-context";
import {
  getMentionQueryAtCursor,
  getMentionQueryFromBlock,
  lightTheme,
  parseInitialContent,
  type MentionEntity,
} from "./editor-utils";
import { useDropdownPosition, type MentionDropdownPosition } from "./mention-position";
import { useMentionKeys, useMentionSelect } from "./use-mention-select";

type EditorInstanceProps = {
  initialContent?: Block[];
  editable: boolean;
  entityId: string;
  entityType: "DOCUMENT" | "TASK";
  fragment: ReturnType<typeof useEditorCollaboration>["fragment"];
  localUser: ReturnType<typeof useEditorCollaboration>["localUser"];
  onChange: (blocks: Block[]) => void;
  provider: ReturnType<typeof useEditorCollaboration>["provider"];
  shouldBootstrapContent: boolean;
  workspaceId: string;
  dropdownRef: RefObject<HTMLDivElement | null>;
  filteredEntities: MentionEntity[];
  highlightedIndex: number;
  mentionQuery: string;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  setMentionQuery: Dispatch<SetStateAction<string>>;
  setShowMentions: Dispatch<SetStateAction<boolean>>;
  showMentions: boolean;
};

export function EditorInstanceView({
  initialContent,
  editable,
  onChange,
  entityId,
  entityType,
  fragment,
  localUser,
  provider,
  shouldBootstrapContent,
  workspaceId,
  dropdownRef,
  filteredEntities,
  highlightedIndex,
  mentionQuery,
  setActiveIndex,
  setMentionQuery,
  setShowMentions,
  showMentions,
}: EditorInstanceProps) {
  const parsedInitialContent = useMemo(() => parseInitialContent(initialContent), [initialContent]);
  const hasBootstrappedContentRef = useRef(false);
  const isBootstrappingContentRef = useRef(false);
  const [dropdownPosition, setDropdownPosition] = useState<MentionDropdownPosition | null>(null);

  const editor = useCreateBlockNote(
    {
      ...(provider
        ? {
            collaboration: {
              provider,
              fragment,
              user: {
                name: localUser.name ?? "eren",
                color: localUser.color,
              },
              showCursorLabels: "always" as const,
            },
          }
        : {}),
      initialContent: provider ? undefined : parsedInitialContent,
    },
    [fragment, provider]
  );

  const updateDropdownPosition = useDropdownPosition(showMentions, setDropdownPosition);

  const selectMention = useMentionSelect({
    editor,
    entityId,
    entityType,
    mentionQuery,
    workspaceId,
    setMentionQuery,
    setShowMentions,
  });

  useMentionKeys({
    editor,
    entityId,
    entityType,
    mentionQuery,
    workspaceId,
    dropdownRef,
    filteredEntities,
    highlightedIndex,
    showMentions,
    selectMention,
    setActiveIndex,
    setMentionQuery,
    setShowMentions,
  });

  useEffect(() => {
    hasBootstrappedContentRef.current = false;
    isBootstrappingContentRef.current = false;
  }, [editor]);

  useEffect(() => {
    if (
      !provider ||
      !shouldBootstrapContent ||
      hasBootstrappedContentRef.current ||
      !parsedInitialContent ||
      parsedInitialContent.length === 0
    ) {
      return;
    }

    hasBootstrappedContentRef.current = true;

    try {
      isBootstrappingContentRef.current = true;
      editor.replaceBlocks(editor.document, parsedInitialContent);
    } catch (err) {
      console.warn("Bootstrap failed:", err);
      hasBootstrappedContentRef.current = false;
    } finally {
      setTimeout(() => {
        isBootstrappingContentRef.current = false;
      }, 0);
    }
  }, [editor, parsedInitialContent, provider, shouldBootstrapContent]);

  const handleChange = () => {
    if (isBootstrappingContentRef.current) return;

    const currentMentionQuery =
      getMentionQueryAtCursor() ?? getMentionQueryFromBlock(editor.getTextCursorPosition().block);

    if (currentMentionQuery !== null) {
      if (!showMentions || mentionQuery !== currentMentionQuery) {
        setActiveIndex(0);
      }
      setShowMentions(true);
      setMentionQuery(currentMentionQuery);
      requestAnimationFrame(() => updateDropdownPosition());
    } else {
      setShowMentions(false);
      setMentionQuery("");
      setDropdownPosition(null);
    }

    onChange(editor.document);
  };

  return (
    <div
      className="relative w-full overflow-visible"
      style={{ minHeight: "320px" }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();

        try {
          editor.focus();
          const blocks = editor.document;
          if (blocks.length > 0) {
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock) {
              editor.setTextCursorPosition(lastBlock, "end");
            }
          }
        } catch {
          editor.focus();
        }
      }}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={lightTheme}
        onChange={handleChange}
        className="vion-blocknote h-full w-full overflow-scroll"
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
          position={dropdownPosition}
          onSelect={(item) => {
            void selectMention(item);
          }}
        />
      )}
    </div>
  );
}
