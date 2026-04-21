"use client";

import type { Block } from "@blocknote/core";
import EditorCore from "./editor-core";

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
  // let parsed: Block[] | undefined;

  // try {
  //   parsed = description ? JSON.parse(description) : undefined;
  // } catch {
  //   parsed = undefined;
  // }

  return (
    <EditorCore
      context={{
        entityType: "TASK",
        entityId: taskId,
        workspaceId,
      }}
      initialContent={initialContent}
      editable={true}
      onChange={onChange}
    />
  );
}
