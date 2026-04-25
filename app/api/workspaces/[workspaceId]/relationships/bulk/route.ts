import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

type BulkMentionBody = {
  sourceEntityType?: "TASK" | "DOCUMENT";
  sourceEntityId?: string;
  mentions?: Array<{
    entityType?: string;
    entityId?: string;
  }>;
};

const RELATIONSHIP_TARGET_TYPES = new Set(["TASK", "DOCUMENT"]);

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

    const validMentions = Array.from(
      new Map(
        body.mentions
          .filter(
            (mention): mention is { entityType: "TASK" | "DOCUMENT"; entityId: string } =>
              typeof mention.entityId === "string" &&
              RELATIONSHIP_TARGET_TYPES.has(mention.entityType ?? ""),
          )
          .map((mention) => [`${mention.entityType}:${mention.entityId}`, mention]),
      ).values(),
    );

    const existingRelationships = await prisma.relationship.findMany({
      where: {
        workspaceId,
        sourceEntityType,
        sourceEntityId,
        relationshipType: "REFERENCES",
      },
      select: {
        id: true,
        targetEntityType: true,
        targetEntityId: true,
      },
    });

    const nextKeys = new Set(
      validMentions.map((mention) => `${mention.entityType}:${mention.entityId}`),
    );
    const existingKeys = new Set(
      existingRelationships.map(
        (relationship) =>
          `${relationship.targetEntityType}:${relationship.targetEntityId}`,
      ),
    );

    const relationshipIdsToDelete = existingRelationships
      .filter(
        (relationship) =>
          !nextKeys.has(
            `${relationship.targetEntityType}:${relationship.targetEntityId}`,
          ),
      )
      .map((relationship) => relationship.id);

    const mentionsToCreate = validMentions.filter(
      (mention) => !existingKeys.has(`${mention.entityType}:${mention.entityId}`),
    );

    if (relationshipIdsToDelete.length > 0) {
      await prisma.relationship.deleteMany({
        where: {
          id: { in: relationshipIdsToDelete },
        },
      });
    }

    if (mentionsToCreate.length > 0) {
      await prisma.relationship.createMany({
        data: mentionsToCreate.map((mention) => ({
          workspaceId,
          sourceEntityType,
          sourceEntityId,
          targetEntityType: mention.entityType,
          targetEntityId: mention.entityId,
          relationshipType: "REFERENCES",
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        created: mentionsToCreate.length,
        deleted: relationshipIdsToDelete.length,
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
