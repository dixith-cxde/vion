import { chatMessageInclude } from "@/lib/chat/runtime";
import { prisma } from "@/lib/prisma";
import { MessageWithRelations } from "@/types/message.type";
export type GetChannelMessagesType = {
  channelId: string;
  userId: string;
  cursor?: string;
  limit?: number;
};
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
  const nextCursor = hasNextPage ? (slicedMessages[slicedMessages.length - 1]?.id ?? null) : null;

  return {
    messages: slicedMessages.reverse(),
    nextCursor,
  };
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
