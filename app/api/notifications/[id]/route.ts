import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";

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

    if (!notificationId || typeof notificationId !== "string") {
      return NextResponse.json(
        { success: false, message: "INVALID_ID" },
        { status: 400 },
      );
    }

    // Update only if owned by user
    const updated = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
        isRead: false, // prevents unnecessary writes
      },
      data: {
        isRead: true,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { success: false, message: "NOT_FOUND_OR_ALREADY_UPDATED" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: notificationId,
        isRead: true,
      },
    });
  } catch (err) {
    console.error("PATCH /api/notifications/[id] error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
