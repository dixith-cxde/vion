import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";

import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getCurrentDBUser } from "@/lib/services/user.service";

import { createChannel, getWorkspaceChannels } from "@/lib/services/channel.service";
import { emitChannelCreated } from "@/lib/socket/chat.events";

import { createChannelSchema } from "@/lib/validators/channel";


export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get("workspaceId");
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 20;

    if (!workspaceId) {
      return NextResponse.json(
        {
          error: "workspaceId is required",
        },
        {
          status: 400,
        }
      );
    }

    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const channels = await getWorkspaceChannels({
      workspaceId,
      userId: currentUser.id,
      cursor: cursor || undefined,
      limit,
    });

    return NextResponse.json(
      {
        channels,
      },
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error("ERROR_FETCHING_CHANNELS", err);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentDBUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = createChannelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { workspaceId, name, description, topic, type, visibility, memberIds } = parsed.data;

    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const channel = await createChannel({
      workspaceId,

      createdById: currentUser.id,

      name,

      description,

      topic,

      type,

      visibility,

      memberIds,
    });

    emitChannelCreated({
      workspaceId,
      channel,
    });

    return NextResponse.json(
      {
        channel,
      },
      {
        status: 201,
      }
    );
  } catch (err) {
    console.error("ERROR_CREATING_CHANNEL", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "CHANNEL_NAME_TAKEN" }, { status: 409 });
    }

    const message = err instanceof Error ? err.message : "Failed to create channel";
    const status = message === "Some users are not members of the workspace." ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
