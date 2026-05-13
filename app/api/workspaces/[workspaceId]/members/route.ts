import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(_req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json(
        {
          success: false,
          error: access.error,
        },
        {
          status: access.status,
        }
      );
    }

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },

      include: {
        user: {
          select: {
            id: true,

            name: true,

            username: true,

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
    console.error("MEMBERS_GET_ERROR", err);

    return NextResponse.json(
      {
        success: false,

        error: "Failed to fetch workspace members",
      },
      {
        status: 500,
      }
    );
  }
}
