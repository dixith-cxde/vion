import { prisma } from "@/lib/prisma";
import { ChannelRole, ChannelType, ChannelVisibility } from "@/lib/generated/prisma/enums";

export type ChannelReadState = {
  channelId: string;
  userId: string;
  lastReadAt: Date | null;
  lastReadMessageId: string | null;
};

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

  const resolvedMessage = messageId
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
