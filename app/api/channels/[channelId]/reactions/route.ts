import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChannelAccess } from "@/lib/channel-access";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { toggleMessageReaction } from "@/lib/services/message.service";
import { emitMessageReaction } from "@/lib/socket/chat.events";

const reactionSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(32),
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
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const message = await toggleMessageReaction({
      channelId,
      messageId: parsed.data.messageId,
      userId: currentUser.id,
      emoji: parsed.data.emoji,
    });

    emitMessageReaction({
      channelId,
      message,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("ERROR_TOGGLING_REACTION", error);
    const message = error instanceof Error ? error.message : "Failed to update reaction";
    const status = message === "Message not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
