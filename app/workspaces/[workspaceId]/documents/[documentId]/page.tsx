import { prisma } from "@/lib/prisma";
import type { Block } from "@blocknote/core";
import DocumentEditor from "@/app/_components/editor/document-editor";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { canEditDocumentEntity } from "@/lib/services/permissions.service";

type BlockLike = {
  type: string;
  [key: string]: unknown;
};

function isBlockArray(value: unknown): value is Block[] {
  return (
    Array.isArray(value) &&
    value.every(
      (block): block is BlockLike =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        typeof (block as Record<string, unknown>)["type"] === "string",
    )
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; documentId: string }>;
}) {
  const { workspaceId, documentId } = await params;

  const document = await prisma.document.findFirst({
    where: { id: documentId, workspaceId },
    include: { author: true },
  });

  const currentUser = await getCurrentDBUser();
  const membership =
    currentUser
      ? await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId: currentUser.id,
            },
          },
        })
      : null;

  if (!document) {
    throw new Error("Document not found");
  }

  const content = isBlockArray(document.contentJson)
    ? document.contentJson
    : undefined;

  return (
    <div>
      <DocumentEditor
        documentId={documentId}
        workspaceId={workspaceId}
        initialContent={content}
        editable={
          membership
            ? canEditDocumentEntity({
                role: membership.role,
                userId: membership.userId,
                authorId: document.authorId,
              })
            : false
        }
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
