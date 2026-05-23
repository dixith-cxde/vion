import { ChatChannelSummary, chatChannelInclude, getChannelActivityAt, sortChannelsByActivity } from "@/lib/chat/runtime";
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

export type ChannelReadState = {
  channelId: string;
  userId: string;
  lastReadAt: Date | null;
  lastReadMessageId: string | null;
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

  if (missingMemberIds.length > 0) {
    throw new Error("Some users are not members of the workspace.");
  }

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
    include: chatChannelInclude,
  });

  return {
    ...channel,
    currentMember:
      channel.members.find((member) => member.userId === createdById) ?? null,
    unreadCount: 0,
    activityAt: getChannelActivityAt(channel),
    typingUserIds: [],
    presenceUserIds: [],
  };
}

export async function createDMChannel({
  targetUserId,
  currentUserId,
  workspaceId,
}: CreateDMChannelType): Promise<ChannelWithMembers> {
  if (targetUserId === currentUserId) {
    throw new Error("Self chat is not possible here");
  }

  const participantKey = [currentUserId, targetUserId].sort().join("_");
  const dmKey = `${workspaceId}:${participantKey}`;

  const existingDM = await prisma.channel.findUnique({
    where: {
      dmKey,
    },
    include: chatChannelInclude,
  });

  if (existingDM) {
    return {
      ...existingDM,
      currentMember:
        existingDM.members.find((member) => member.userId === currentUserId) ?? null,
      unreadCount: await getUnreadCount(existingDM.id, currentUserId, null),
      activityAt: getChannelActivityAt(existingDM),
      typingUserIds: [],
      presenceUserIds: [],
    };
  }

  const legacyDM = await prisma.channel.findFirst({
    where: {
      workspaceId,
      type: ChannelType.DM,
      deletedAt: null,
      OR: [
        {
          dmKey: participantKey,
        },
        {
          AND: [
            {
              members: {
                some: {
                  userId: currentUserId,
                },
              },
            },
            {
              members: {
                some: {
                  userId: targetUserId,
                },
              },
            },
          ],
        },
      ],
    },
    include: chatChannelInclude,
  });

  if (legacyDM) {
    if (legacyDM.dmKey !== dmKey) {
      await prisma.channel.update({
        where: {
          id: legacyDM.id,
        },
        data: {
          dmKey,
        },
      });
    }

    return {
      ...legacyDM,
      dmKey,
      currentMember:
        legacyDM.members.find((member) => member.userId === currentUserId) ?? null,
      unreadCount: await getUnreadCount(legacyDM.id, currentUserId, null),
      activityAt: getChannelActivityAt(legacyDM),
      typingUserIds: [],
      presenceUserIds: [],
    };
  }

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
    include: chatChannelInclude,
  });

  if (existingSelfChannel) {
    return {
      ...existingSelfChannel,
      currentMember:
        existingSelfChannel.members.find((member) => member.userId === userId) ?? null,
      unreadCount: 0,
      activityAt: getChannelActivityAt(existingSelfChannel),
      typingUserIds: [],
      presenceUserIds: [],
    };
  }

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
}: GetWorkspaceChannelsType): Promise<ChatChannelSummary[]> {
  const safeLimit = Math.min(limit, 50);

  await createSelfChannel({
    workspaceId,
    userId,
  });

  const channels = await prisma.channel.findMany({
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
    include: chatChannelInclude,
    orderBy: [{ updatedAt: "desc" }, { position: "asc" }, { id: "desc" }],
    take: safeLimit,
    ...(cursor
      ? {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }
      : {}),
  });

  const summaries = await Promise.all(
    channels.map(async (channel) => {
      const currentMember = channel.members.find((member) => member.userId === userId) ?? null;
      const unreadCount = await getUnreadCount(channel.id, userId, currentMember?.lastReadAt ?? null);

      return {
        ...channel,
        currentMember,
        unreadCount,
        activityAt: getChannelActivityAt(channel),
        typingUserIds: [],
        presenceUserIds: [],
      } satisfies ChatChannelSummary;
    }),
  );

  return sortChannelsByActivity(summaries);
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

export async function markChannelRead({
  channelId,
  userId,
  messageId,
}: {
  channelId: string;
  userId: string;
  messageId?: string | null;
}): Promise<ChannelReadState> {
  const fallbackMessage = messageId
    ? null
    : await prisma.message.findFirst({
        where: {
          channelId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          createdAt: true,
        },
      });

  const resolvedMessage =
    messageId
      ? await prisma.message.findFirst({
          where: {
            id: messageId,
            channelId,
            deletedAt: null,
          },
          select: {
            id: true,
            createdAt: true,
          },
        })
      : fallbackMessage;

  const readAt = resolvedMessage?.createdAt ?? new Date();

  const membership = await prisma.channelMember.update({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    data: {
      lastReadAt: readAt,
      lastReadMessageId: resolvedMessage?.id ?? null,
    },
  });

  if (resolvedMessage) {
    const unreadMessages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        createdAt: {
          lte: resolvedMessage.createdAt,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessages.map((message) => ({
          messageId: message.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }
  }

  return {
    channelId: membership.channelId,
    userId: membership.userId,
    lastReadAt: membership.lastReadAt,
    lastReadMessageId: membership.lastReadMessageId,
  };
}

export async function getChannelSummaryForUser({
  channelId,
  userId,
}: {
  channelId: string;
  userId: string;
}) {
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
    include: chatChannelInclude,
  });

  if (!channel) {
    return null;
  }

  const currentMember = channel.members.find((member) => member.userId === userId) ?? null;

  return {
    ...channel,
    currentMember,
    unreadCount: await getUnreadCount(channel.id, userId, currentMember?.lastReadAt ?? null),
    activityAt: getChannelActivityAt(channel),
    typingUserIds: [],
    presenceUserIds: [],
  } satisfies ChatChannelSummary;
}

async function getUnreadCount(channelId: string, userId: string, lastReadAt: Date | null) {
  return prisma.message.count({
    where: {
      channelId,
      deletedAt: null,
      authorId: {
        not: userId,
      },
      ...(lastReadAt
        ? {
            createdAt: {
              gt: lastReadAt,
            },
          }
        : {}),
    },
  });
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

  if (publicChannels.length === 0) {
    return;
  }

  await prisma.channelMember.createMany({
    data: publicChannels.map((channel) => ({
      channelId: channel.id,
      userId,
      role: ChannelRole.MEMBER,
    })),
    skipDuplicates: true,
  });
}
