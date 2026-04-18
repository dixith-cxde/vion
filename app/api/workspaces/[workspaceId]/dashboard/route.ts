import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getWorkspaceDashboard } from "@/lib/services/dashboard.service";

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  try {
    const access = await requireWorkspaceAccess(params.workspaceId);

    if ("error" in access) {
      return NextResponse.json(
        { message: access.error },
        { status: access.status },
      );
    }

    const data = await getWorkspaceDashboard(params.workspaceId);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch dashboard" },
      { status: 500 },
    );
  }
}
