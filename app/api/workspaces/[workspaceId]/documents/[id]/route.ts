import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateDocumentSchema } from "@/lib/validators/documents";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { syncEntityMentions } from "@/lib/services/entity-mention-sync.service";
import { canEditDocumentEntity } from "@/lib/services/permissions.service";

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

      const graphMatch = href.match(/[?&]entityType=([^&#]+).*?[?&]entityId=([^&#]+)/i);
      if (graphMatch) {
        const entityType = decodeURIComponent(graphMatch[1]);
        const entityId = decodeURIComponent(graphMatch[2]);

        mentions.set(`${entityType}:${entityId}`, {
          id: entityId,
          type: entityType,
        });
      }

      const channelMatch = href.match(/[?&]channelId=([0-9a-f-]{36})(?:$|[&#])/i);
      if (channelMatch) {
        mentions.set(`CHANNEL:${channelMatch[1]}`, {
          id: channelMatch[1],
          type: "CHANNEL",
        });
      }

      const messageMatch = href.match(/[?&]messageId=([0-9a-f-]{36})(?:$|[&#])/i);
      if (messageMatch) {
        mentions.set(`MESSAGE:${messageMatch[1]}`, {
          id: messageMatch[1],
          type: "MESSAGE",
        });
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
    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

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

    if (
      !canEditDocumentEntity({
        role: access.membership.role,
        userId: access.user.id,
        authorId: existingDocument.authorId,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to edit this document",
        },
        { status: 403 }
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
      const nextMentions = extractMentionRefs(documentFields.contentJson).map((mention) => ({
        entityType: mention.type,
        entityId: mention.id,
      }));

      await syncEntityMentions({
        workspaceId,
        sourceEntityType: "DOCUMENT",
        sourceEntityId: parsedParams.data.id,
        mentions: nextMentions,
        actorId: currentUser?.id,
        notificationEntityType: "DOCUMENT",
        notificationEntityId: parsedParams.data.id,
        notificationTitle: "You were mentioned",
        notificationMessage: `You were mentioned in @${document.title}`,
      });
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
