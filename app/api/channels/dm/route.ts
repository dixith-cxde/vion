import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { createDMChannel } from "@/lib/services/channel.service";
import { emitChannelCreated } from "@/lib/socket/chat.events";
import { createDMChannelSchema } from "@/lib/validators/channel";
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const parsed = createDMChannelSchema.safeParse(body);

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

    const { workspaceId, targetUserId } = parsed.data;

    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      select: { id: true },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "TARGET_NOT_MEMBER" }, { status: 403 });
    }

    const channel = await createDMChannel({
      workspaceId,

      currentUserId: currentUser.id,

      targetUserId,
    });

    emitChannelCreated({
      workspaceId,
      channel,
    });

    return NextResponse.json(
      {
        success: true,

        data: channel,
      },
      {
        status: 201,
      }
    );
  } catch (err) {
    console.error("ERROR_CREATING_DM_CHANNEL", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create DM channel",
      },
      {
        status: 500,
      }
    );
  }
}
