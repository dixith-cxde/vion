import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;

    await requireWorkspaceAccess(workspaceId);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (err) {
    console.error("Members GET error:", err);
    return new NextResponse("Internal Server Error", {
      status: 500,
    });
  }
}
