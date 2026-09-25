import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireChannelAccess } from "@/lib/channel-access";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { sendMessage, getChannelMessages } from "@/lib/services/message.service";
import { sendMessageSchema, getChannelMessagesSchema } from "@/lib/validators/message.validator";
import {
  emitChannelActivity,
  emitChannelMessage,
  emitChannelUpdated,
} from "@/lib/socket/chat.events";
import { getChannelSummaryForUser } from "@/lib/services/channel.service";

type Params = {
  params: Promise<{
    channelId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { channelId } = await params;

    const channelAccess = await requireChannelAccess(channelId);

    if ("error" in channelAccess) {
      return NextResponse.json(
        { error: channelAccess.error },
        { status: channelAccess.status }
      );
    }

    const body = await request.json();

    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.message,
        },
        {
          status: 400,
        }
      );
    }

    const { workspaceId, content, contentJson, parentId, type, attachments } = parsed.data;

    const message = await sendMessage({
      workspaceId,
      channelId,
      authorId: currentUser.id,
      content,
      contentJson: contentJson as Prisma.InputJsonValue | undefined,
      parentId,
      type,
      attachments,
    });

    emitChannelMessage({
      workspaceId,
      channelId,
      message,
    });
    emitChannelActivity({
      workspaceId,
      channelId,
      message,
    });

    const channel = await getChannelSummaryForUser({
      channelId,
      userId: currentUser.id,
    });

    if (channel) {
      emitChannelUpdated({
        workspaceId,
        channel,
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("ERROR_SENDING_MESSAGE", err);

    const message = err instanceof Error ? err.message : "Failed to send message";
    const status =
      message === "User is not a member of this channel." ? 403
      : message === "Channel not found." || message === "Parent message not found." ? 404
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { channelId } = await params;

    const channelAccess = await requireChannelAccess(channelId);

    if ("error" in channelAccess) {
      return NextResponse.json(
        { error: channelAccess.error },
        { status: channelAccess.status }
      );
    }

    const { searchParams } = new URL(request.url);

    const parsed = getChannelMessagesSchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: Number(searchParams.get("limit") || 20),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.message,
        },
        {
          status: 400,
        }
      );
    }

    const { cursor, limit } = parsed.data;

    const result = await getChannelMessages({
      channelId,
      userId: currentUser.id,
      cursor,
      limit,
    });

    return NextResponse.json(
      {
        messages: result.messages,
        nextCursor: result.nextCursor,
      },
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error("ERROR_FETCHING_MESSAGES", err);

    return NextResponse.json(
      {
        error: "Failed to fetch messages",
      },
      {
        status: 500,
      }
    );
  }
}
