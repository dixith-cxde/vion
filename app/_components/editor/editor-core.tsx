"use client";

import type { Block } from "@blocknote/core";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
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
  replaceMentionTokenInBlock,
  type MentionEntity,
} from "./editor-utils";

import { toast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";

interface EditorProps {
  initialContent?: Block[];
  editable?: boolean;
  onChange: (blocks: Block[]) => void;
}

type MentionDropdownPosition = {
  left: number;
  top: number;
  width: number;
  placement: "top" | "bottom";
};

export default function EditorCore({ initialContent, editable = true, onChange }: EditorProps) {
  const { isLoaded: clerkLoaded } = useUser();
  const {
    entityId,
    entityType,
    fragment,
    editorReady,
    mode,
    localUser,
    provider,
    roomName,
    shouldBootstrapContent,
    workspaceId,
  } = useEditorCollaboration();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const entityLoadErrorShownRef = useRef(false);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entities, setEntities] = useState<MentionEntity[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState<MentionDropdownPosition | null>(null);

  useEffect(() => {
    async function fetchEntities() {
      try {
        if (!workspaceId) return;

        const params = new URLSearchParams();
        const trimmedQuery = mentionQuery.trim();

        if (trimmedQuery) {
          params.set("q", trimmedQuery);
        }

        params.set("limit", "20");

        const response = await fetch(`/api/workspaces/${workspaceId}/entities?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load mention entities");
        }
        const payload = (await response.json()) as { data?: MentionEntity[] };
        entityLoadErrorShownRef.current = false;
        setEntities(payload.data ?? []);
      } catch (err) {
        console.error("Entity fetch failed", err);
        if (!entityLoadErrorShownRef.current) {
          entityLoadErrorShownRef.current = true;
          toast({
            title: "Mentions unavailable",
            description: "Workspace entities could not be loaded.",
            variant: "destructive",
          });
        }
      }
    }

    void fetchEntities();
  }, [mentionQuery, workspaceId]);

  const filteredEntities = useMemo(() => entities, [entities]);

  const highlightedIndex =
    filteredEntities.length > 0 ? Math.min(activeIndex, filteredEntities.length - 1) : 0;

  if (!editorReady && mode === "collaborative") {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Connecting...
      </div>
    );
  }

  if (!editorReady || !clerkLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Connecting collaboration...
      </div>
    );
  }

  return (
    <EditorCoreInstance
      key={`${provider ? "collaborative" : "local"}:${roomName}`}
      editable={editable}
      entityId={entityId}
      entityType={entityType}
      fragment={fragment}
      initialContent={initialContent}
      localUser={localUser}
      onChange={onChange}
      provider={provider}
      shouldBootstrapContent={shouldBootstrapContent}
      workspaceId={workspaceId}
      dropdownRef={dropdownRef}
      filteredEntities={filteredEntities}
      highlightedIndex={highlightedIndex}
      mentionQuery={mentionQuery}
      setActiveIndex={setActiveIndex}
      setMentionQuery={setMentionQuery}
      setShowMentions={setShowMentions}
      showMentions={showMentions}
      dropdownPosition={dropdownPosition}
      setDropdownPosition={setDropdownPosition}
    />
  );
}

type EditorCoreInstanceProps = {
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
  dropdownPosition: MentionDropdownPosition | null;
  setDropdownPosition: Dispatch<SetStateAction<MentionDropdownPosition | null>>;
};

function EditorCoreInstance({
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
  dropdownPosition,
  setDropdownPosition,
}: EditorCoreInstanceProps) {
  const parsedInitialContent = useMemo(() => parseInitialContent(initialContent), [initialContent]);
  const hasBootstrappedContentRef = useRef(false);
  const isBootstrappingContentRef = useRef(false);

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

  const updateDropdownPosition = useCallback(() => {
    if (!showMentions || typeof window === "undefined") {
      setDropdownPosition(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setDropdownPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const anchorElement =
      selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection.anchorNode?.parentElement;
    const fallbackRect =
      anchorElement
        ?.closest(".bn-editor [data-content-type], .bn-editor .bn-block-content")
        ?.getBoundingClientRect() ?? null;
    const sourceRect = rect.width > 0 || rect.height > 0 ? rect : fallbackRect;

    if (!sourceRect) {
      setDropdownPosition(null);
      return;
    }

    const viewportPadding = 16;
    const preferredWidth = Math.min(420, Math.max(320, window.innerWidth * 0.32));
    const maxWidth = Math.max(280, window.innerWidth - viewportPadding * 2);
    const width = Math.min(preferredWidth, maxWidth);
    const left = Math.min(
      Math.max(sourceRect.left, viewportPadding),
      window.innerWidth - width - viewportPadding
    );
    const roomBelow = window.innerHeight - sourceRect.bottom;
    const placement = roomBelow > 280 ? "bottom" : "top";
    const top =
      placement === "bottom"
        ? Math.min(sourceRect.bottom + 12, window.innerHeight - viewportPadding - 120)
        : Math.max(viewportPadding, sourceRect.top - 12 - 320);

    setDropdownPosition({
      left,
      top,
      width,
      placement,
    });
  }, [setDropdownPosition, showMentions]);

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

  useEffect(() => {
    if (!showMentions) {
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => {
      updateDropdownPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("selectionchange", handleReposition);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("selectionchange", handleReposition);
    };
  }, [setDropdownPosition, showMentions, updateDropdownPosition]);

  const handleChange = () => {
    if (isBootstrappingContentRef.current) return;

    const currentMentionQuery =
      getMentionQueryAtCursor() ??
      getMentionQueryFromBlock(editor.getTextCursorPosition().block);

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
        className="h-full w-full overflow-scroll"
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
