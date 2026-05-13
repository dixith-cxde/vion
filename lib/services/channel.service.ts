import { prisma } from "@/lib/prisma";
import { ChannelRole, ChannelType, ChannelVisibility } from "@/lib/generated/prisma/enums";
import { ChannelWithMembers } from "../../types/channel.type";

export type CreateChannelType = {
  workspaceId: string;
  createdById: string;
  name?: string;
  description?: string;
  topic?: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  dmKey?: string;
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

const channelInclude = {
  createdBy: true,

  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          username: true,
        },
      },
    },
  },

  messages: {
    orderBy: {
      createdAt: "desc" as const,
    },

    take: 1,
  },

  pinnedMessages: true,
};

export async function createChannel({
  createdById,
  memberIds,
  name,
  description,
  topic,
  type,
  visibility,
  dmKey,
  workspaceId,
}: CreateChannelType): Promise<ChannelWithMembers> {
  let resolvedMemberIds = [...memberIds, createdById];

  if (type === ChannelType.GROUP && visibility === ChannelVisibility.PUBLIC) {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },

      select: {
        userId: true,
      },
    });

    resolvedMemberIds = workspaceMembers.map((member) => member.userId);
  }

  const uniqueMemberIds = Array.from(new Set(resolvedMemberIds));

  const validWorkspaceMembers = await prisma.workspaceMember.findMany({
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

  const validMemberIds = validWorkspaceMembers.map((member) => member.userId);

  const missingMemberIds = uniqueMemberIds.filter((userId) => !validMemberIds.includes(userId));

  if (missingMemberIds.length > 0) throw new Error("Some users are not members of the workspace.");

  const channel = await prisma.channel.create({
    data: {
      name,

      slug: name?.toLowerCase().trim().replace(/\s+/g, "-"),

      description,

      topic,

      type,

      visibility,

      dmKey,

      workspaceId,

      createdById,

      members: {
        create: validMemberIds.map((userId) => ({
          userId,

          role: userId === createdById ? ChannelRole.ADMIN : ChannelRole.MEMBER,
        })),
      },
    },

    include: channelInclude,
  });

  return channel;
}

export async function createDMChannel({
  targetUserId,
  currentUserId,
  workspaceId,
}: CreateDMChannelType): Promise<ChannelWithMembers> {
  if (targetUserId === currentUserId) throw new Error("Self chat is not possible here");

  const dmKey = [currentUserId, targetUserId].sort().join("_");

  const existingDM = await prisma.channel.findUnique({
    where: {
      dmKey,
    },

    include: channelInclude,
  });

  if (existingDM) return existingDM;

  return createChannel({
    workspaceId,

    createdById: currentUserId,

    memberIds: [targetUserId],

    type: ChannelType.DM,

    visibility: ChannelVisibility.PRIVATE,

    dmKey,
  });
}

export async function createSelfChannel({
  workspaceId,
  userId,
}: CreateSelfChannelType): Promise<ChannelWithMembers> {
  const existingSelfChannel = await prisma.channel.findFirst({
    where: {
      workspaceId,

      type: ChannelType.SELF,

      members: {
        some: {
          userId,
        },
      },
    },

    include: channelInclude,
  });

  if (existingSelfChannel) return existingSelfChannel;

  return createChannel({
    workspaceId,

    createdById: userId,

    type: ChannelType.SELF,

    visibility: ChannelVisibility.PRIVATE,

    memberIds: [],
  });
}

export async function getWorkspaceChannels({
  workspaceId,
  userId,
  limit = 20,
  cursor,
}: GetWorkspaceChannelsType): Promise<ChannelWithMembers[]> {
  const safeLimit = Math.min(limit, 50);

  return prisma.channel.findMany({
    where: {
      workspaceId,

      deletedAt: null,

      isArchived: false,

      OR: [
        {
          type: ChannelType.GROUP,

          visibility: ChannelVisibility.PUBLIC,
        },

        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },

    include: channelInclude,

    orderBy: [
      {
        position: "asc",
      },

      {
        updatedAt: "desc",
      },

      {
        id: "desc",
      },
    ],

    take: safeLimit,

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
    where: {
      id: channelId,

      deletedAt: null,

      isArchived: false,

      OR: [
        {
          type: ChannelType.GROUP,

          visibility: ChannelVisibility.PUBLIC,
        },

        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },

    select: {
      id: true,
    },
  });

  return !!channel;
}

export async function addUserToWorkspacePublicChannels({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const publicChannels = await prisma.channel.findMany({
    where: {
      workspaceId,

      type: ChannelType.GROUP,

      visibility: ChannelVisibility.PUBLIC,

      deletedAt: null,

      isArchived: false,
    },

    select: {
      id: true,
    },
  });

  if (publicChannels.length === 0) return;

  await prisma.channelMember.createMany({
    data: publicChannels.map((channel) => ({
      channelId: channel.id,

      userId,

      role: ChannelRole.MEMBER,
    })),

    skipDuplicates: true,
  });
}
