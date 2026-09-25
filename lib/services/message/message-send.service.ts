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
export type MessageAttachmentInput = {
  url: string;
  name: string;
  mimeType?: string | null;
  extension?: string | null;
  size?: number | null;
};

export type SendMessageType = {
  workspaceId: string;
  channelId: string;
  authorId: string;
  content: string;
  contentJson?: Prisma.InputJsonValue;
  parentId?: string;
  type?: MessageType;
  attachments?: MessageAttachmentInput[];
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

  const mentionEntities = await resolveUniversalMentionEntities(
    workspaceId,
    universalMentionTokens
  );

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
