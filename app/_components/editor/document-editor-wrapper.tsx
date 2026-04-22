"use client";

import type { Block } from "@blocknote/core";
import { useDebounce } from "@/lib/hooks/use-debounce";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
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
  const autosaveErrorShownRef = useRef(false);

  useEffect(() => {
    async function save() {
      try {
        setSaveState("saving");
        if (!debouncedContent) return null;
        const response = await fetch(
          `/api/workspaces/${workspaceId}/documents/${documentId}`,
          {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentJson: debouncedContent,
          }),
          },
        );

        if (!response.ok) {
          throw new Error("Autosave failed");
        }

        autosaveErrorShownRef.current = false;
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        console.error("Autosave failed", err);
        if (!autosaveErrorShownRef.current) {
          autosaveErrorShownRef.current = true;
          toast({
            title: "Autosave failed",
            description: "Your latest document changes could not be saved.",
            variant: "destructive",
          });
        }
      }
    }

    if (debouncedContent) {
      void save();
    }
  }, [debouncedContent, documentId, setSaveState, workspaceId]);

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
