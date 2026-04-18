import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getWorkspaceDashboard } from "@/lib/services/dashboard.service";

export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json(
        { message: access.error },
        { status: access.status },
      );
    }

    const data = await getWorkspaceDashboard(workspaceId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("DASHBOARD API ERROR:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to fetch dashboard",
      },
      { status: 500 },
    );
  }
}
