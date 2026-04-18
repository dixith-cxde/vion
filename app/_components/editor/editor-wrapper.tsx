"use client";

import dynamic from "next/dynamic";

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
  initialContent?: string;
  meta: EditorMeta;
}

export default function EditorWrapper({
  documentId,
  initialContent,
  meta,
}: Props) {
  return (
    <Editor
      documentId={documentId}
      initialContent={initialContent}
      meta={meta}
    />
  );
}
