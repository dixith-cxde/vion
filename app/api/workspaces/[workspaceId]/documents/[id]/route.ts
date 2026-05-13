import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateDocumentSchema } from "@/lib/validators/documents";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { createNotification } from "@/lib/services/notification.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { emitNotificationRemoval } from "@/server/socket/events/notification.events";

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

    const record = node as Record<string, any>;

    if (record.type === "link" && typeof record.href === "string") {
      const href: string = record.href;

      // USER mention
      if (href.includes("/members/")) {
        const id = href.split("/members/")[1];
        if (id) {
          mentions.set(`USER:${id}`, {
            id,
            type: "USER",
          });
        }
      }

      // TASK mention
      if (href.includes("/tasks/")) {
        const id = href.split("/tasks/")[1];
        if (id) {
          mentions.set(`TASK:${id}`, {
            id,
            type: "TASK",
          });
        }
      }

      // DOCUMENT mention (if you support it)
      if (href.includes("/documents/")) {
        const id = href.split("/documents/")[1];
        if (id) {
          mentions.set(`DOCUMENT:${id}`, {
            id,
            type: "DOCUMENT",
          });
        }
      }
    }

    Object.values(record).forEach(visit);
  };

  visit(value);
  return Array.from(mentions.values());
}

function hasPrismaCode(error: unknown, code: string): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { workspaceId, id } = resolvedParams;
    await requireWorkspaceAccess(workspaceId);

    const currentUser = await getCurrentDBUser();
    const parsedParams = paramsSchema.safeParse({ id });

    if (!parsedParams.success) {
      return NextResponse.json({ success: false, error: "Invalid document ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = updateDocumentSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsedBody.error.issues[0]?.message ?? "Invalid payload",
        },
        { status: 400 }
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
        { status: 404 }
      );
    }

    // FIXED TYPE (no create)
    const documentData: {
      contentJson?: Prisma.InputJsonValue;
      title?: string;
      summary?: string;
      status?: "DRAFT" | "PUBLISHED";
      version?: number;
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

    if (documentFields.version !== undefined) {
      documentData.version = documentFields.version;
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

      const userMentions = nextMentions.filter((m) => m.type === "USER");
      const otherMentions = nextMentions.filter((m) => m.type !== "USER");

      // ===== REFERENCES (TASK / DOCUMENT) =====
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

      const nextKeys = new Set(otherMentions.map((m) => `${m.type}:${m.id}`));

      const existingKeys = new Set(
        existingRelationships.map((r) => `${r.targetEntityType}:${r.targetEntityId}`)
      );

      const relationshipIdsToDelete = existingRelationships
        .filter((r) => !nextKeys.has(`${r.targetEntityType}:${r.targetEntityId}`))
        .map((r) => r.id);

      const relationshipsToCreate = otherMentions.filter(
        (m) => !existingKeys.has(`${m.type}:${m.id}`)
      );

      if (relationshipIdsToDelete.length > 0) {
        await prisma.relationship.deleteMany({
          where: { id: { in: relationshipIdsToDelete } },
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

      // ===== USER MENTIONS =====
      const existingUserRelationships = await prisma.relationship.findMany({
        where: {
          workspaceId,
          sourceEntityType: "DOCUMENT",
          sourceEntityId: parsedParams.data.id,
          relationshipType: "MENTIONS",
          targetEntityType: "USER",
        },
        select: {
          id: true,
          targetEntityId: true,
        },
      });

      const nextUserIds = new Set(userMentions.map((m) => m.id));
      const existingUserIds = new Set(existingUserRelationships.map((r) => r.targetEntityId));

      const userRelsToDelete = existingUserRelationships.filter(
        (r) => !nextUserIds.has(r.targetEntityId)
      );

      const userMentionsToCreate = userMentions.filter((m) => !existingUserIds.has(m.id));

      // CREATE USER REL + NOTIFICATION
      for (const m of userMentionsToCreate) {
        const rel = await prisma.relationship.create({
          data: {
            workspaceId,
            sourceEntityType: "DOCUMENT",
            sourceEntityId: parsedParams.data.id,
            targetEntityType: "USER",
            targetEntityId: m.id,
            relationshipType: "MENTIONS",
          },
        });

        await createNotification({
          userId: m.id,
          senderId: currentUser?.id,
          workspaceId,
          type: "MENTIONED",
          title: "You were mentioned",
          message: `You were mentioned in @${document.title}`,
          entityType: "DOCUMENT",
          entityId: parsedParams.data.id,
        });
      }

      // DELETE USER REL + NOTIFICATION
      for (const rel of userRelsToDelete) {
        // 1. get notification BEFORE deleting
        const notifications = await prisma.notification.findMany({
          where: {
            relationshipId: rel.id,
          },
          select: {
            id: true,
            userId: true,
          },
        });

        // 2. delete notifications
        await prisma.notification.deleteMany({
          where: {
            relationshipId: rel.id,
          },
        });

        // 3. emit removal event
        for (const n of notifications) emitNotificationRemoval({ userId: n.userId, notificationId: n.id });

        // 4. delete relationship
        await prisma.relationship.deleteMany({
          where: { id: rel.id },
        });
      }
    }
    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (err: unknown) {
    console.error("Document PATCH error:", err);

    if (hasPrismaCode(err, "P2025")) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
