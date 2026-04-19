"use client";

import type { Block } from "@blocknote/core";
import { useDebounce } from "@/lib/hooks/use-debounce";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("saved");

  useEffect(() => {
    async function save() {
      try {
        setSaveState("saving");
        if (!debouncedContent) return null;
        await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentJson: debouncedContent,
          }),
        });

        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
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
      workspaceId={workspaceId}
      initialContent={initialContent}
      meta={meta}
      onChange={setContent}
      saveState={saveState}
    />
  );
}
