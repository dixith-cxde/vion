import { NextResponse } from "next/server";
import { z } from "zod";

import { getEntityHref } from "@/lib/entities/mention";
import { searchGithubWorkspaceEntities } from "@/lib/services/github.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const querySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(25).optional(),
});

export async function GET(
  request: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/github/search">,
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

    const results = await searchGithubWorkspaceEntities({
      workspaceId,
      query: parsed.data.q,
      limit: parsed.data.limit,
    });

    return NextResponse.json({
      success: true,
      data: results.map((result) => ({
        ...result,
        href: getEntityHref(workspaceId, result.entityType, result.entityId),
      })),
    });
  } catch (error) {
    console.error("GITHUB_ENTITY_SEARCH_ERROR", error);
    return NextResponse.json(
      { success: false, error: "Failed to search GitHub entities" },
      { status: 500 },
    );
  }
}
