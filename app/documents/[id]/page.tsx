import { prisma } from "@/lib/prisma";
import EditorWrapper from "@/app/_components/editor/editor-wrapper";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      author: true,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_transparent_28%),linear-gradient(180deg,#f2f4fa_0%,#e9edf6_100%)] text-[#171821]">
      <div className="w-full px-0 py-0 md:px-0 md:py-0">
        <EditorWrapper
          documentId={id}
          initialContent={
            document.contentJson
              ? JSON.stringify(document.contentJson)
              : undefined
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
    </div>
  );
}
