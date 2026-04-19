import { prisma } from "@/lib/prisma";
import EditorWrapper from "@/app/_components/editor/editor-wrapper";

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

  if (!document.contentJson) {
    console.log("NO CONTENT YET");
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading editor...
      </div>
    );
  }
  return (
    <div>
      <EditorWrapper
        documentId={documentId}
        workspaceId={workspaceId}
        initialContent={document.contentJson}
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
