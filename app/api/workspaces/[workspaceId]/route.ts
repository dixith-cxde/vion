import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceAdmin } from "@/lib/services/permissions.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(
  _req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json(
        { success: false, message: access.error },
        { status: access.status },
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, message: "WORKSPACE_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    await requireWorkspaceAdmin(workspaceId, user.id);

    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Workspace name is required" },
        { status: 400 },
      );
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "NOT_MEMBER" || message === "NOT_ALLOWED" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}
