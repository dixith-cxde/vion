"use client";

import type { Block } from "@blocknote/core";
import { useDebounce } from "@/lib/hooks/use-debounce";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SaveState } from "@/types";
import "./editor.css";

const EditorCore = dynamic(() => import("./editor-core"), {
  ssr: false,
});

interface Props {
  documentId: string;
  workspaceId: string;
  initialContent?: Block[];
  setSaveState: (saveState: SaveState) => void;
}

export default function EditorWrapper({
  documentId,
  initialContent,
  workspaceId,
  setSaveState,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const debouncedContent = useDebounce(content, 1000);

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
    <EditorCore
      context={{
        entityType: "DOCUMENT",
        entityId: documentId,
        workspaceId,
      }}
      initialContent={initialContent}
      editable={true}
      onChange={setContent}
    />
  );
}
