import { NextRequest, NextResponse } from 'next/server';
import { getCurrentDBUser } from '@/lib/services/user.service';
import { createSelfChannel } from '@/lib/services/channel.service';
import { createSelfChannelSchema } from '@/lib/validators/channel';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentDBUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSelfChannelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { workspaceId } = parsed.data;
    const channel = await createSelfChannel({
      workspaceId,
      userId: currentUser.id,
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (err) {
    console.error('ERROR_CREATING_SELF_CHANNEL', err);
    return NextResponse.json({ error: 'Failed to create self channel' }, { status: 500 });
  }
}
