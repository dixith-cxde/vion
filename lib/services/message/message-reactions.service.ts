import { Prisma } from "@/lib/generated/prisma/client";
import { MessageType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getMessageForChannel, sendMessage } from "../message.service";
export async function toggleMessageReaction({
  channelId,
  messageId,
  userId,
  emoji,
}: {
  channelId: string;
  messageId: string;
  userId: string;
  emoji: string;
}) {
  const existing = await prisma.message.findFirst({
    where: { id: messageId, channelId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Message not found.");
  }

  const existingReaction = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingReaction) {
    await prisma.messageReaction.delete({
      where: {
        id: existingReaction.id,
      },
    });
  } else {
    await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  return getMessageForChannel({
    channelId,
    messageId,
  });
}

export async function togglePinnedMessage({
  channelId,
  messageId,
  userId,
  pinned,
}: {
  channelId: string;
  messageId: string;
  userId: string;
  pinned: boolean;
}) {
  const existing = await prisma.message.findFirst({
    where: { id: messageId, channelId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Message not found.");
  }

  if (pinned) {
    await prisma.pinnedMessage.upsert({
      where: {
        messageId_channelId: {
          messageId,
          channelId,
        },
      },
      create: {
        channelId,
        messageId,
        pinnedById: userId,
      },
      update: {
        pinnedById: userId,
      },
    });
  } else {
    await prisma.pinnedMessage.deleteMany({
      where: {
        channelId,
        messageId,
      },
    });
  }

  return getMessageForChannel({
    channelId,
    messageId,
  });
}

export async function createActivityMessage({
  workspaceId,
  channelId,
  authorId,
  content,
  contentJson,
}: {
  workspaceId: string;
  channelId: string;
  authorId: string;
  content: string;
  contentJson?: Prisma.InputJsonValue;
}) {
  return sendMessage({
    workspaceId,
    channelId,
    authorId,
    content,
    contentJson,
    type: MessageType.ACTIVITY,
  });
}
