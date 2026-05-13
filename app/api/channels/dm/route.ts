import { NextRequest, NextResponse } from "next/server";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { createDMChannel } from "@/lib/services/channel.service";
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

    const channel = await createDMChannel({
      workspaceId,

      currentUserId: currentUser.id,

      targetUserId,
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
