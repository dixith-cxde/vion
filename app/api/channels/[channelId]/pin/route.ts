import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChannelAccess } from "@/lib/channel-access";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { togglePinnedMessage } from "@/lib/services/message.service";
import { emitMessagePinned } from "@/lib/socket/chat.events";

const pinSchema = z.object({
  messageId: z.string().min(1),
  pinned: z.boolean(),
});

type Params = {
  params: Promise<{
    channelId: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = await params;

    const channelAccess = await requireChannelAccess(channelId);

    if ("error" in channelAccess) {
      return NextResponse.json({ error: channelAccess.error }, { status: channelAccess.status });
    }

    const body = await request.json();
    const parsed = pinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const message = await togglePinnedMessage({
      channelId,
      messageId: parsed.data.messageId,
      userId: currentUser.id,
      pinned: parsed.data.pinned,
    });

    emitMessagePinned({
      channelId,
      message,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("ERROR_TOGGLING_PIN", error);
    const message = error instanceof Error ? error.message : "Failed to update pinned state";
    const status = message === "Message not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
