import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { requireWorkspaceAdmin } from "@/lib/services/permissions.service";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentDBUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const invite = await prisma.invitation.findUnique({
      where: { id: params.id },
    });

    if (!invite) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    // permission check
    await requireWorkspaceAdmin(invite.workspaceId, user.id);

    await prisma.invitation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
