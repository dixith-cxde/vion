import { NextResponse } from "next/server";
import { z } from "zod";
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
    return NextResponse.json({ error: "Failed to update pinned state" }, { status: 500 });
  }
}
