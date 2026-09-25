import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const user = await getCurrentDBUser();
    const { workspaceId } = await params;
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const invites = await prisma.invitation.findMany({
      where: {
        workspaceId: workspaceId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: invites,
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
