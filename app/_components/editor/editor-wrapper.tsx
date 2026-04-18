"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./editor"), {
  ssr: false,
});

interface Props {
  documentId: string;
  initialContent?: string;
}

export default function EditorWrapper({ documentId, initialContent }: Props) {
  return <Editor documentId={documentId} initialContent={initialContent} />;
}
