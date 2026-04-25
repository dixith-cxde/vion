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
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import MentionDropdown from "./mention-dropdown";
import { useEditorCollaboration } from "./collaboration-context";
import {
  getMentionQueryAtCursor,
  lightTheme,
  normalizeEntities,
  parseInitialContent,
  replaceMentionTokenInBlock,
  type MentionEntity,
} from "./editor-utils";

import { toast } from "@/hooks/use-toast";
import { User } from "@/lib/generated/prisma/client";

interface EditorProps {
  initialContent?: Block[];
  editable?: boolean;

  onChange: (blocks: Block[]) => void;
}

export default function EditorCore({
  initialContent,
  editable = true,
  onChange,
}: EditorProps) {
  const {
    entityId,
    entityType,
    fragment,
    editorReady,
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

  useEffect(() => {
    async function fetchEntities() {
      try {
        if (!workspaceId) return;

        const [tasksRes, docsRes, membersRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks`),
          fetch(`/api/workspaces/${workspaceId}/documents`),
          fetch(`/api/workspaces/${workspaceId}/members`),
        ]);

        if (!tasksRes.ok || !docsRes.ok || !membersRes.ok) {
          throw new Error("Failed to load mention entities");
        }

        const tasks = (await tasksRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };
        const docs = (await docsRes.json()) as {
          data?: Array<{ id: string; title: string }>;
        };
        const members = (await membersRes.json()) as {
          data?: Array<User>;
        };
        entityLoadErrorShownRef.current = false;
        setEntities(normalizeEntities(tasks, docs, members));
      } catch (err) {
        console.error("Entity fetch failed", err);
        if (!entityLoadErrorShownRef.current) {
          entityLoadErrorShownRef.current = true;
          toast({
            title: "Mentions unavailable",
            description: "Tasks, documents, and members could not be loaded.",
            variant: "destructive",
          });
        }
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

  if (!editorReady) {
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
}: EditorCoreInstanceProps) {
  const editor = useCreateBlockNote(
    {
      ...(provider
        ? {
            collaboration: {
              provider,
              fragment,
              user: localUser,
              showCursorLabels: "always" as const,
            },
          }
        : {}),
      initialContent:
        !provider || shouldBootstrapContent
          ? parseInitialContent(initialContent)
          : undefined,
    },
    [fragment, provider],
  );

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

  return (
    <div
      className="relative h-full w-full"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
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
