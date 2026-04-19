"use client";

import { useDebounce } from "@/lib/hooks/use-debounce";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useWorkspace } from "../context/workspace-context-provider";
import { Block } from "@blocknote/core";

const Editor = dynamic(() => import("./editor"), {
  ssr: false,
});

interface EditorMeta {
  title: string;
  status: string;
  version: number;
  summary?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  documentId: string;
  workspaceId: string;
  initialContent?: Block[];
  meta: EditorMeta;
}

export default function EditorWrapper({
  documentId,
  initialContent,
  workspaceId,
  meta,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const debouncedContent = useDebounce(content, 1000);

  // const { activeWorkspace } = useWorkspace();
  // const workspaceId = activeWorkspace?.id;

  useEffect(() => {
    async function save() {
      try {
        if (!debouncedContent) return null;
        await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentJson: debouncedContent,
          }),
        });
      } catch (err) {
        console.error("Autosave failed", err);
      }
    }

    if (debouncedContent) {
      save();
    }
  }, [debouncedContent]);

  return (
    <Editor
      documentId={documentId}
      initialContent={initialContent}
      meta={meta}
      onChange={setContent}
    />
  );
}
