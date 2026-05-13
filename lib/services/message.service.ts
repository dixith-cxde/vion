import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MessageWithRelations } from "@/types/message.type";

type SendMessageType = {
  workspaceId: string;
  channelId: string;
  authorId: string;
  content: string;
  contentJson?: Prisma.InputJsonValue;
  parentId?: string;
};

type GetChannelMessagesType = {
  channelId: string;
  userId: string;
  cursor?: string;
  limit?: number;
};

export async function sendMessage({
  workspaceId,
  channelId,
  authorId,
  content,
  contentJson,
  parentId,
}: SendMessageType): Promise<MessageWithRelations> {
  console.log({ authorId });
  const channelMember = await prisma.channelMember.findFirst({
    where: {
      channelId,
      userId: authorId,
    },
    select: {
      id: true,
    },
  });

  if (!channelMember) {
    throw new Error("User is not a member of this channel.");
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: channelId,
      workspaceId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!channel) {
    throw new Error("Channel not found.");
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        workspaceId,
        channelId,
        authorId,
        content,
        contentJson: contentJson ?? Prisma.JsonNull,
        parentId,
      },
      include: {
        author: true,
        reactions: {
          include: {
            user: true,
          },
        },
        attachments: true,
        replies: true,
      },
    }),

    prisma.channel.update({
      where: {
        id: channelId,
      },
      data: {
        updatedAt: new Date(),
      },
    }),
  ]);

  return message;
}

export async function getChannelMessages({
  channelId,
  userId,
  cursor,
  limit = 20,
}: GetChannelMessagesType): Promise<MessageWithRelations[]> {
  console.log({ channelId, userId });
  const channelMember = await prisma.channelMember.findFirst({
    where: { channelId, userId },
    select: { id: true },
  });
  console.log({ channelMember });

  if (!channelMember) {
    throw new Error("User is not a member of this channel.");
  }

  const safeLimit = Math.min(limit, 100);

  const messages = await prisma.message.findMany({
    where: {
      channelId,
      deletedAt: null,
    },
    include: {
      author: true,
      reactions: {
        include: {
          user: true,
        },
      },
      attachments: true,
      replies: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
    ...(cursor && {
      skip: 1,
      cursor: {
        id: cursor,
      },
    }),
  });

  return messages.reverse();
}
