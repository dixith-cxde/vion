import { NextResponse } from "next/server";
import { getWorkspaceGithubOverview } from "@/lib/services/github.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

type Params = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspaceId } = await params;
    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const overview = await getWorkspaceGithubOverview(workspaceId);

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error("ERROR_FETCHING_WORKSPACE_GITHUB_OVERVIEW", error);
    return NextResponse.json(
      { success: false, error: "Failed to load GitHub workspace data" },
      { status: 500 },
    );
  }
}
