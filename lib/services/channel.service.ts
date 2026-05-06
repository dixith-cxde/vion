import { prisma } from '@/lib/prisma';
import { ChannelWithMembers } from '@/types/channel';

export type ChannelType = 'DM' | 'PUBLIC' | 'PRIVATE' | 'GROUP' | 'SELF';

type CreateChannelType = {
  workspaceId: string;
  createdById: string;

  name?: string;

  type: ChannelType;

  memberIds: string[];
};

type CreateDMChannelType = {
  workspaceId: string;
  currentUserId: string;
  targetUserId: string;
};

type CreateSelfChannelType = {
  workspaceId: string;
  userId: string;
};

type GetWorkspaceChannelsType = {
  workspaceId: string;
  userId: string;

  cursor?: string;
  limit?: number;
};

type IsChannelMemberType = {
  channelId: string;
  userId: string;
};

export async function createChannel({
  createdById,
  memberIds,
  name,
  type,
  workspaceId,
}: CreateChannelType): Promise<ChannelWithMembers> {
  // Ensure creator exists in members
  const uniqueMemberIds = Array.from(new Set([...memberIds, createdById]));

  // Validate workspace membership
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: {
        in: uniqueMemberIds,
      },
    },
    select: {
      userId: true,
    },
  });

  const validMemberIds = workspaceMembers.map((member) => member.userId);

  if (validMemberIds.length !== uniqueMemberIds.length) {
    throw new Error('Some users are not members of the workspace.');
  }

  return await prisma.$transaction(async (tx) => {
    // Create channel
    const createdChannel = await tx.channel.create({
      data: {
        name,
        type,
        workspaceId,
        createdById,

        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,

            role: userId === createdById ? 'ADMIN' : 'MEMBER',
          })),
        },
      },

      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return createdChannel;
  });
}

export async function createDMChannel({
  targetUserId,
  currentUserId,
  workspaceId,
}: CreateDMChannelType): Promise<ChannelWithMembers> {
  if (targetUserId === currentUserId) throw new Error(`Self chat is not possible here`);

  const existingDM = await prisma.channel.findFirst({
    where: {
      workspaceId,
      type: 'DM',
      AND: [
        { members: { some: { userId: currentUserId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: { members: { include: { user: true } } },
  });
  if (existingDM) return existingDM;

  return createChannel({
    workspaceId,
    createdById: currentUserId,
    memberIds: [targetUserId],
    type: 'DM',
  });
}

export async function createSelfChannel({
  workspaceId,
  userId,
}: CreateSelfChannelType): Promise<ChannelWithMembers> {
  const existingSelfChannel = await prisma.channel.findFirst({
    where: {
      workspaceId,

      type: 'SELF',

      members: {
        some: {
          userId,
        },
      },
    },

    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (existingSelfChannel) {
    return existingSelfChannel;
  }

  // Create new self channel
  return createChannel({
    workspaceId,
    createdById: userId,
    type: 'SELF',
    memberIds: [],
  });
}

export async function getWorkspaceChannels({
  workspaceId,
  userId,
  limit,
  cursor,
}: GetWorkspaceChannelsType): Promise<ChannelWithMembers[]> {
  return prisma.channel.findMany({
    where: {
      workspaceId,
      OR: [{ type: 'PUBLIC' }, { members: { some: { userId } } }],
    },
    include: { members: { include: { user: true } } },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: {
        id: cursor,
      },
    }),
  });
}

export async function isChannelMember({
  channelId,
  userId,
}: IsChannelMemberType): Promise<boolean> {
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, OR: [{ type: 'PUBLIC' }, { members: { some: { userId } } }] },
    select: { id: true },
  });

  return !!channel;
}
