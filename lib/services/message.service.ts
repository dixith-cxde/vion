import { Prisma } from "@/lib/generated/prisma/client";
import { MessageType } from "@/lib/generated/prisma/enums";
import { extractMentionTokens, chatMessageInclude } from "@/lib/chat/runtime";
import {
  extractUniversalMentionTokens,
  resolveUniversalMentionEntities,
} from "@/lib/entities/mention";
import { prisma } from "@/lib/prisma";
import { syncEntityMentions } from "@/lib/services/entity-mention-sync.service";
import { MessageWithRelations } from "@/types/message.type";

type MessageAttachmentInput = {
  url: string;
  name: string;
  mimeType?: string | null;
  extension?: string | null;
  size?: number | null;
};

type SendMessageType = {
  workspaceId: string;
  channelId: string;
  authorId: string;
  content: string;
  contentJson?: Prisma.InputJsonValue;
  parentId?: string;
  type?: MessageType;
  attachments?: MessageAttachmentInput[];
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
  type = MessageType.TEXT,
  attachments = [],
}: SendMessageType): Promise<MessageWithRelations> {
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
      workspaceId: true,
      name: true,
    },
  });

  if (!channel) {
    throw new Error("Channel not found.");
  }

  if (parentId) {
    const parentMessage = await prisma.message.findFirst({
      where: {
        id: parentId,
        channelId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!parentMessage) {
      throw new Error("Parent message not found.");
    }
  }

  const mentionUsernames = extractMentionTokens(content);
  const universalMentionTokens = extractUniversalMentionTokens(content);

  const mentionedUsers =
    mentionUsernames.length === 0
      ? []
      : await prisma.workspaceMember.findMany({
          where: {
            workspaceId,
            user: {
              OR: [
                {
                  username: {
                    in: mentionUsernames,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    in: mentionUsernames,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        });

  const mentionEntities = await resolveUniversalMentionEntities(workspaceId, universalMentionTokens);

  const message = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        workspaceId,
        channelId,
        authorId,
        content,
        contentJson: contentJson ?? Prisma.JsonNull,
        parentId,
        type,
        attachments: attachments.length
          ? {
              create: attachments.map((attachment) => ({
                url: attachment.url,
                name: attachment.name,
                mimeType: attachment.mimeType ?? null,
                extension: attachment.extension ?? null,
                size: attachment.size ?? null,
              })),
            }
          : undefined,
        mentions:
          mentionedUsers.length > 0
            ? {
                create: mentionedUsers
                  .map(({ user }) => user)
                  .filter((user) => user.id !== authorId)
                  .map((user) => ({
                    userId: user.id,
                  })),
              }
            : undefined,
        reads: {
          create: {
            userId: authorId,
          },
        },
      },
      include: chatMessageInclude,
    });

    await tx.channel.update({
      where: {
        id: channelId,
      },
      data: {
        updatedAt: createdMessage.createdAt,
      },
    });

    await tx.channelMember.update({
      where: {
        channelId_userId: {
          channelId,
          userId: authorId,
        },
      },
      data: {
        lastReadAt: createdMessage.createdAt,
        lastReadMessageId: createdMessage.id,
      },
    });

    return createdMessage;
  });

  await syncEntityMentions({
    workspaceId,
    sourceEntityType: "MESSAGE",
    sourceEntityId: message.id,
    actorId: authorId,
    notificationEntityType: "MESSAGE",
    notificationEntityId: message.id,
    notificationTitle: "You were mentioned",
    notificationMessage: `You were mentioned in ${channel.name ?? "a conversation"}.`,
    mentions: [
      ...mentionedUsers.map(({ user }) => ({
        entityType: "USER",
        entityId: user.id,
      })),
      ...mentionEntities.map((entity) => ({
        entityType: entity.entityType,
        entityId: entity.entityId,
      })),
    ],
  });

  return message;
}

export async function getChannelMessages({
  channelId,
  userId,
  cursor,
  limit = 20,
}: GetChannelMessagesType): Promise<{
  messages: MessageWithRelations[];
  nextCursor: string | null;
}> {
  const channelMember = await prisma.channelMember.findFirst({
    where: { channelId, userId },
    select: { id: true },
  });

  if (!channelMember) {
    throw new Error("User is not a member of this channel.");
  }

  const safeLimit = Math.min(limit, 100);
  const messages = await prisma.message.findMany({
    where: {
      channelId,
      deletedAt: null,
      parentId: null,
    },
    include: chatMessageInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit + 1,
    ...(cursor
      ? {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }
      : {}),
  });

  const hasNextPage = messages.length > safeLimit;
  const slicedMessages = hasNextPage ? messages.slice(0, safeLimit) : messages;
  const nextCursor = hasNextPage ? slicedMessages[slicedMessages.length - 1]?.id ?? null : null;

  return {
    messages: slicedMessages.reverse(),
    nextCursor,
  };
}

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

export async function getMessageForChannel({
  channelId,
  messageId,
}: {
  channelId: string;
  messageId: string;
}) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      channelId,
      deletedAt: null,
    },
    include: chatMessageInclude,
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  return message;
}
