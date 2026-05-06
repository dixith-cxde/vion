import { NextRequest, NextResponse } from 'next/server';

import { getCurrentDBUser } from '@/lib/services/user.service';

import { createChannel, getWorkspaceChannels } from '@/lib/services/channel.service';

import { createChannelSchema } from '@/lib/validators/channel';

// -- GET CHANNELS ---------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get('workspaceId');

    const cursor = searchParams.get('cursor');

    const limitParam = searchParams.get('limit');

    const limit = limitParam ? Number(limitParam) : 20;

    if (!workspaceId) {
      return NextResponse.json(
        {
          error: 'workspaceId is required',
        },
        {
          status: 400,
        }
      );
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
    console.error('ERROR_FETCHING_CHANNELS', err);

    return NextResponse.json(
      {
        error: 'Failed to fetch channels',
      },
      {
        status: 500,
      }
    );
  }
}

// -- CREATE CHANNEL -------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentDBUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const parsed = createChannelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { workspaceId, name, type, visibility, memberIds } = parsed.data;

    const channel = await createChannel({
      workspaceId,

      createdById: currentUser.id,

      name,

      type,

      visibility,

      memberIds,
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
    console.error('ERROR_CREATING_CHANNEL', err);

    return NextResponse.json(
      {
        error: 'Failed to create channel',
      },
      {
        status: 500,
      }
    );
  }
}
