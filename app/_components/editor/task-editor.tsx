"use client";

import type { Block } from "@blocknote/core";
import dynamic from "next/dynamic";

const EditorCore = dynamic(() => import("./editor-core"), {
  ssr: false,
});

type Props = {
  taskId: string;
  workspaceId: string;
  description?: Block[];
  onChange: (blocks: Block[]) => void;
};

export default function TaskEditor({
  taskId,
  workspaceId,
  description: initialContent,
  onChange,
}: Props) {
  return (
    <EditorCore
      key={`${workspaceId}:${taskId}`}
      initialContent={initialContent}
      editable={true}
      onChange={onChange}
    />
  );
}
