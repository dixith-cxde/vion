import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";

type RouteParams = {
  params: { id: string };
};

/**
 * PATCH → Toggle read/unread state
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id: notificationId } = await params;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "INVALID_ID" },
        { status: 400 },
      );
    }

    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: !existing.isRead,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/notifications/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE → Permanently delete notification
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id: notificationId } = await params;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "INVALID_ID" },
        { status: 400 },
      );
    }

    const result = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, message: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: notificationId,
      },
    });
  } catch (error) {
    console.error("DELETE /api/notifications/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
