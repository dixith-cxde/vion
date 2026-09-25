import {
  ChatChannelSummary,
  chatChannelInclude,
  getChannelActivityAt,
  sortChannelsByActivity,
} from "@/lib/chat/runtime";
import { prisma } from "@/lib/prisma";
import { ChannelType, ChannelVisibility } from "@/lib/generated/prisma/enums";

import { createSelfChannel } from "../channel.service";
export type GetWorkspaceChannelsType = {
  workspaceId: string;
  userId: string;
  cursor?: string;
  limit?: number;
};

export type IsChannelMemberType = {
  channelId: string;
  userId: string;
};

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
      const unreadCount = await getUnreadCount(
        channel.id,
        userId,
        currentMember?.lastReadAt ?? null
      );

      return {
        ...channel,
        currentMember,
        unreadCount,
        activityAt: getChannelActivityAt(channel),
        typingUserIds: [],
        presenceUserIds: [],
      } satisfies ChatChannelSummary;
    })
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

export async function getUnreadCount(channelId: string, userId: string, lastReadAt: Date | null) {
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
