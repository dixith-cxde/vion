import { NextResponse } from "next/server";

import { getGithubRepositoryDetail } from "@/lib/services/github.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/github/repositories/[...repository]">,
) {
  try {
    const { workspaceId, repository } = await context.params;
    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const repositorySegments = Array.isArray(repository)
      ? repository
      : typeof repository === "string"
        ? [repository]
        : [];
    const repositoryFullName = repositorySegments.join("/").trim();

    if (!repositoryFullName || repositorySegments.length < 2) {
      return NextResponse.json(
        { success: false, error: "Repository must be in owner/repo format" },
        { status: 400 },
      );
    }

    const detail = await getGithubRepositoryDetail({
      workspaceId,
      repositoryFullName,
    });

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("GITHUB_REPOSITORY_DETAIL_ERROR", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load repository details",
      },
      { status: 500 },
    );
  }
}
