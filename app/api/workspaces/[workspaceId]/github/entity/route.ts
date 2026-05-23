import { NextResponse } from "next/server";
import { z } from "zod";

import { getGithubEntityDetail } from "@/lib/services/github.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const querySchema = z.object({
  entityType: z.enum(["GITHUB_REPOSITORY", "GITHUB_PULL_REQUEST", "GITHUB_ISSUE", "GITHUB_DISCUSSION", "GITHUB_RELEASE", "GITHUB_BRANCH", "COMMIT"]),
  entityId: z.string().min(1),
});

export async function GET(
  request: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/github/entity">,
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
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
        { status: 400 },
      );
    }

    const detail = await getGithubEntityDetail({
      workspaceId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    });

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("GITHUB_ENTITY_DETAIL_ERROR", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load GitHub entity" },
      { status: 500 },
    );
  }
}
