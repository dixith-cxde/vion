import { prisma } from "@/lib/prisma";
import EditorWrapper from "@/app/_components/editor/editor-wrapper";
import type { Block } from "@blocknote/core";

function isBlockArray(value: unknown): value is Block[] {
  return (
    Array.isArray(value) &&
    value.every(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        typeof (block as any).type === "string",
    )
  );
}

export default async function Page({
  params,
}: {
  params: { workspaceId: string; documentId: string };
}) {
  const { workspaceId, documentId } = await params;
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId,
    },
    include: {
      author: true,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  const content = isBlockArray(document.contentJson)
    ? document.contentJson
    : undefined;

  return (
    <div>
      <EditorWrapper
        documentId={documentId}
        workspaceId={workspaceId}
        initialContent={content}
        meta={{
          title: document.title,
          status: document.status,
          version: document.version,
          summary: document.summary,
          authorId: document.authorId,
          authorName: document.author?.name ?? null,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
        }}
      />
    </div>
  );
}
