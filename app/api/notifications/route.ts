import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    // Build filter safely
    const where: {
      userId: string;
      workspaceId?: string;
    } = {
      userId: user.id,
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    // Parallel queries for performance
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          entityType: true,
          entityId: true,
          workspaceId: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
      },
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const sender = await getCurrentDBUser();

    if (!sender) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const {
      userId, // receiver
      workspaceId,
      type,
      title,
      message,
      entityType,
      entityId,
    } = body;

    const notification = await createNotification({
      userId,
      workspaceId,
      type,
      title,
      message,
      entityType,
      entityId,
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error("POST /api/notification error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
