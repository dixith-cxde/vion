import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let workspaceId: string | undefined;

    // Safe body parsing (body may be empty)
    try {
      const body = await req.json();
      workspaceId = body?.workspaceId;
    } catch {
      workspaceId = undefined;
    }

    // Build query safely
    const where: {
      userId: string;
      isRead: boolean;
      workspaceId?: string;
    } = {
      userId: user.id,
      isRead: false,
    };

    if (workspaceId && typeof workspaceId === "string") {
      where.workspaceId = workspaceId;
    }

    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      meta: {
        updatedCount: result.count,
      },
    });
  } catch (err) {
    console.error("PATCH /api/notifications/mark-all error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
