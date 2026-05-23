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
  editable?: boolean;
};

export default function TaskEditor({
  taskId,
  workspaceId,
  description: initialContent,
  onChange,
  editable = true,
}: Props) {
  return (
    <div className="w-full h-full">
      <EditorCore
        key={`${workspaceId}:${taskId}`}
        initialContent={initialContent}
        editable={editable}
        onChange={onChange}
      />
    </div>
  );
}
