import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { requireWorkspaceAdmin } from "@/lib/services/permissions.service";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  try {
    const { workspaceId, memberId } = await context.params;
    const user = await getCurrentDBUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await requireWorkspaceAdmin(workspaceId, user.id);

    const { role } = await req.json();

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "NOT_MEMBER" || message === "NOT_ALLOWED" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ workspaceId: string; memberId: string }> },
) {
  try {
    const { workspaceId, memberId } = await context.params;
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await requireWorkspaceAdmin(workspaceId, user.id);

    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    if (member.role === "OWNER" || member.userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "This member cannot be removed.",
        },
        { status: 400 },
      );
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "NOT_MEMBER" || message === "NOT_ALLOWED" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}
