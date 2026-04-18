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
  });

  if (!document) {
    throw new Error("Document not found");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_transparent_28%),linear-gradient(180deg,#f2f4fa_0%,#e9edf6_100%)] text-[#171821]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <EditorWrapper
          documentId={id}
          initialContent={
            document.contentJson
              ? JSON.stringify(document.contentJson)
              : undefined
          }
        />
      </div>
    </div>
  );
}
