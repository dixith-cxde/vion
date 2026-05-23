import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { syncEntityMentions } from "@/lib/services/entity-mention-sync.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

type BulkMentionBody = {
  sourceEntityType?: "TASK" | "DOCUMENT";
  sourceEntityId?: string;
  mentions?: Array<{
    entityType?: string;
    entityId?: string;
  }>;
};

export async function POST(
  req: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/relationships/bulk">,
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const body = (await req.json()) as BulkMentionBody;

    if (
      !body.sourceEntityType ||
      !body.sourceEntityId ||
      !Array.isArray(body.mentions)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid bulk relationship payload" },
        { status: 400 },
      );
    }

    const sourceEntityType = body.sourceEntityType;
    const sourceEntityId = body.sourceEntityId;
    const currentUser = await getCurrentDBUser();

    const sourceEntityExists =
      sourceEntityType === "TASK"
        ? await prisma.task.findFirst({
            where: {
              id: sourceEntityId,
              workspaceId,
            },
            select: { id: true },
          })
        : await prisma.document.findFirst({
            where: {
              id: sourceEntityId,
              workspaceId,
            },
            select: { id: true },
          });

    if (!sourceEntityExists) {
      return NextResponse.json(
        { success: false, error: "Source entity not found" },
        { status: 404 },
      );
    }

    const result = await syncEntityMentions({
      workspaceId,
      sourceEntityType,
      sourceEntityId,
      mentions: body.mentions
        .filter(
          (mention): mention is { entityType: string; entityId: string } =>
            typeof mention.entityType === "string" && typeof mention.entityId === "string",
        )
        .map((mention) => ({
          entityType: mention.entityType,
          entityId: mention.entityId,
        })),
      actorId: currentUser?.id,
      notificationEntityType: sourceEntityType,
      notificationEntityId: sourceEntityId,
      notificationMessage: `You were mentioned in a ${sourceEntityType.toLowerCase()}.`,
    });

    return NextResponse.json({
      success: true,
      data: {
        created: result.createdReferences + result.createdUserMentions,
        deleted: result.deletedReferences + result.deletedUserMentions,
      },
    });
  } catch (error) {
    console.error("Bulk relationship sync error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to sync relationships" },
      { status: 500 },
    );
  }
}
