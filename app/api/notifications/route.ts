import { prisma } from "@/lib/prisma";
import { notificationWithSenderSelect } from "@/lib/services/notification.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const getNotificationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

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
    const parsed = getNotificationsSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.message },
        { status: 400 },
      );
    }

    const { cursor, limit } = parsed.data;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
        },
        orderBy: { createdAt: "desc" },
        select: notificationWithSenderSelect,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        unreadCount,
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      },
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
