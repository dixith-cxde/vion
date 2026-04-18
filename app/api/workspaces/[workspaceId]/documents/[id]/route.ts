import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateDocumentSchema } from "@/lib/validators/documents";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

type MentionRef = {
  id: string;
  type: string;
};

function extractMentionRefs(value: unknown): MentionRef[] {
  const mentions = new Map<string, MentionRef>();

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const styles =
      record.styles && typeof record.styles === "object"
        ? (record.styles as Record<string, unknown>)
        : null;

    if (
      styles?.mention === true &&
      typeof styles.mentionId === "string" &&
      typeof styles.mentionType === "string"
    ) {
      mentions.set(`${styles.mentionType}:${styles.mentionId}`, {
        id: styles.mentionId,
        type: styles.mentionType,
      });
    }

    Object.values(record).forEach(visit);
  };

  visit(value);
  return Array.from(mentions.values());
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { workspaceId, id } = resolvedParams;

    await requireWorkspaceAccess(workspaceId);

    const parsedParams = paramsSchema.safeParse({ id });

    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: "Invalid document ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsedBody = updateDocumentSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsedBody.error.issues[0]?.message ?? "Invalid payload",
        },
        { status: 400 },
      );
    }

    const { authorName, ...documentFields } = parsedBody.data;

    const existingDocument = await prisma.document.findFirst({
      where: {
        id: parsedParams.data.id,
        workspaceId,
      },
      select: { authorId: true },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: "Document not found in workspace" },
        { status: 404 },
      );
    }

    // FIXED TYPE (no create)
    const documentData: {
      contentJson?: Prisma.InputJsonValue;
      title?: string;
      summary?: string;
      status?: "DRAFT" | "PUBLISHED";
      author?: {
        update: {
          name: string;
        };
      };
    } = {};

    if (documentFields.contentJson !== undefined) {
      documentData.contentJson = documentFields.contentJson;
    }

    if (documentFields.title !== undefined) {
      documentData.title = documentFields.title;
    }

    if (documentFields.summary !== undefined) {
      documentData.summary = documentFields.summary;
    }

    if (documentFields.status !== undefined) {
      documentData.status = documentFields.status;
    }

    if (authorName !== undefined && existingDocument.authorId) {
      documentData.author = {
        update: {
          name: authorName,
        },
      };
    }

    const document = await prisma.document.update({
      where: { id: parsedParams.data.id },
      data: documentData,
      include: {
        author: true,
      },
    });

    if (documentFields.contentJson !== undefined) {
      const nextMentions = extractMentionRefs(documentFields.contentJson);

      const existingRelationships = await prisma.relationship.findMany({
        where: {
          workspaceId,
          sourceEntityType: "DOCUMENT",
          sourceEntityId: parsedParams.data.id,
          relationshipType: "REFERENCES",
        },
        select: {
          id: true,
          targetEntityId: true,
          targetEntityType: true,
        },
      });

      const nextKeys = new Set(nextMentions.map((m) => `${m.type}:${m.id}`));

      const existingKeys = new Set(
        existingRelationships.map(
          (r) => `${r.targetEntityType}:${r.targetEntityId}`,
        ),
      );

      const relationshipIdsToDelete = existingRelationships
        .filter(
          (r) => !nextKeys.has(`${r.targetEntityType}:${r.targetEntityId}`),
        )
        .map((r) => r.id);

      const relationshipsToCreate = nextMentions.filter(
        (m) => !existingKeys.has(`${m.type}:${m.id}`),
      );

      if (relationshipIdsToDelete.length > 0) {
        await prisma.relationship.deleteMany({
          where: {
            id: { in: relationshipIdsToDelete },
          },
        });
      }

      if (relationshipsToCreate.length > 0) {
        await prisma.relationship.createMany({
          data: relationshipsToCreate.map((m) => ({
            workspaceId,
            sourceEntityType: "DOCUMENT",
            sourceEntityId: parsedParams.data.id,
            targetEntityType: m.type,
            targetEntityId: m.id,
            relationshipType: "REFERENCES",
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (err: unknown) {
    console.error("Document PATCH error:", err);

    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
