import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { getChannelSummaryForUser, markChannelRead } from "@/lib/services/channel.service";
import { emitChannelRead, emitChannelUpdated } from "@/lib/socket/chat.events";

const markChannelReadSchema = z.object({
  workspaceId: z.string().min(1),
  messageId: z.string().nullable().optional(),
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
    const parsed = markChannelReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const readState = await markChannelRead({
      channelId,
      userId: currentUser.id,
      messageId: parsed.data.messageId ?? null,
    });

    emitChannelRead({
      channelId,
      userId: currentUser.id,
      lastReadAt: readState.lastReadAt ?? new Date(),
      lastReadMessageId: readState.lastReadMessageId,
    });

    const channel = await getChannelSummaryForUser({
      channelId,
      userId: currentUser.id,
    });

    if (channel) {
      emitChannelUpdated({
        workspaceId: parsed.data.workspaceId,
        channel,
      });
    }

    return NextResponse.json({
      success: true,
      data: readState,
    });
  } catch (error) {
    console.error("ERROR_MARKING_CHANNEL_READ", error);
    return NextResponse.json({ error: "Failed to mark channel as read" }, { status: 500 });
  }
}
