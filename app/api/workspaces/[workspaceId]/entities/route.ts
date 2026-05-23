import { NextResponse } from "next/server";
import { z } from "zod";

import { searchWorkspaceMentionEntities } from "@/lib/entities/mention";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(30).optional(),
});

export async function GET(
  request: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/entities">,
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

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
        { status: 400 },
      );
    }

    const entities = await searchWorkspaceMentionEntities({
      workspaceId,
      query: parsed.data.q,
      limit: parsed.data.limit,
    });

    return NextResponse.json({
      success: true,
      data: entities.map((entity) => ({
        entityId: entity.entityId,
        label: entity.label,
        preview: entity.preview,
        href: entity.href,
        type: entity.entityType,
      })),
    });
  } catch (error) {
    console.error("ENTITY_SEARCH_ERROR", error);
    return NextResponse.json(
      { success: false, error: "Failed to search entities" },
      { status: 500 },
    );
  }
}
