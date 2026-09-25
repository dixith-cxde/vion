"use client";

import type { Block } from "@blocknote/core";
import { useRef } from "react";

import { useEditorCollaboration } from "./collaboration-context";
import { useMentionQuery } from "./use-mention-query";
import { EditorInstanceView } from "./editor-instance";

import { useUser } from "@clerk/nextjs";

interface EditorProps {
  initialContent?: Block[];
  editable?: boolean;
  onChange: (blocks: Block[]) => void;
}

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

  const {
    showMentions,
    setShowMentions,
    mentionQuery,
    setMentionQuery,
    setActiveIndex,
    filteredEntities,
    highlightedIndex,
  } = useMentionQuery(workspaceId);

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
    <EditorInstanceView
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
