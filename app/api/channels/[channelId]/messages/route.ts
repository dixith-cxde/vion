import { NextRequest, NextResponse } from "next/server";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { sendMessage, getChannelMessages } from "@/lib/services/message.service";
import { sendMessageSchema, getChannelMessagesSchema } from "@/lib/validators/message.validator";
import { emitChannelMessage } from "@/lib/socket/chat.events";

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

    const { workspaceId, content, contentJson, parentId } = parsed.data;

    const message = await sendMessage({
      workspaceId,

      channelId,

      authorId: currentUser.id,

      content,

      contentJson,

      parentId,
    });

    emitChannelMessage({
      channelId,
      message,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("ERROR_SENDING_MESSAGE", err);

    return NextResponse.json(
      {
        error: "Failed to send message",
      },
      {
        status: 500,
      }
    );
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

    const messages = await getChannelMessages({
      channelId,
      userId: currentUser.id,
      cursor,
      limit,
    });

    return NextResponse.json(
      {
        messages,
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
