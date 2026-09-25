"use client";

import type { QueryClient } from "@tanstack/react-query";

import { applyWorkspacePresenceToChannels } from "@/lib/chat/cache";

import type {
  CacheHelpers,
  ChannelMessagesInfiniteData,
  WorkspaceChannelsCache,
} from "./chat-cache-helpers";

export type HandlerDeps = {
  queryClient: QueryClient;
  channelId: string | undefined;
  workspaceId: string | undefined;
  currentUserId: string;
  setTypingUserIds: (update: (current: string[]) => string[]) => void;
  setPresenceUserIds: (userIds: string[]) => void;
  cache: CacheHelpers;
};

export function createPresenceHandlers({
  queryClient,
  channelId,
  workspaceId,
  currentUserId,
  setTypingUserIds,
  setPresenceUserIds,
  cache: { updateWorkspaceChannels },
}: HandlerDeps) {
  const handleChannelRead = ({
    channelId: incomingChannelId,
    userId,
    lastReadAt,
    lastReadMessageId,
  }: {
    channelId: string;
    userId: string;
    lastReadAt: string;
    lastReadMessageId: string | null;
  }) => {
    updateWorkspaceChannels(
      (channel) => ({
        ...channel,
        unreadCount: userId === currentUserId ? 0 : channel.unreadCount,
        currentMember:
          userId === currentUserId && channel.currentMember
            ? {
                ...channel.currentMember,
                lastReadAt: new Date(lastReadAt),
                lastReadMessageId,
              }
            : channel.currentMember,
      }),
      incomingChannelId
    );

    if (incomingChannelId !== channelId) {
      return;
    }

    queryClient.setQueryData<ChannelMessagesInfiniteData>(
      ["channel-messages", incomingChannelId],
      (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            messages: page.messages.map((message) => {
              if (new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime()) {
                return message;
              }

              const alreadyRead = message.reads.some((read) => read.userId === userId);

              if (alreadyRead) {
                return message;
              }

              return {
                ...message,
                reads: [
                  ...message.reads,
                  {
                    id: `read-${userId}-${message.id}`,
                    messageId: message.id,
                    userId,
                    readAt: new Date(lastReadAt),
                    user: {
                      id: userId,
                      name: userId === currentUserId ? "You" : "Viewer",
                      imageUrl: null,
                      username: null,
                    },
                  },
                ],
              };
            }),
          })),
        };
      }
    );
  };

  const handleTypingUpdate = ({
    channelId: incomingChannelId,
    userId,
    typing,
  }: {
    channelId: string;
    userId: string;
    userName: string;
    typing: boolean;
  }) => {
    if (incomingChannelId !== channelId || userId === currentUserId) {
      return;
    }

    setTypingUserIds((current) => {
      const next = new Set(current);

      if (typing) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return Array.from(next);
    });

    updateWorkspaceChannels((channel) => {
      const next = new Set(channel.typingUserIds ?? []);

      if (typing) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return {
        ...channel,
        typingUserIds: Array.from(next),
      };
    }, incomingChannelId);
  };

  const handlePresence = ({
    channelId: incomingChannelId,
    userIds,
  }: {
    channelId: string;
    userIds: string[];
  }) => {
    if (incomingChannelId !== channelId) {
      updateWorkspaceChannels(
        (channel) => ({
          ...channel,
          presenceUserIds: userIds,
        }),
        incomingChannelId
      );
      return;
    }

    setPresenceUserIds(userIds);
    updateWorkspaceChannels(
      (channel) => ({
        ...channel,
        presenceUserIds: userIds,
      }),
      incomingChannelId
    );
  };

  const handleWorkspacePresence = ({
    workspaceId: incomingWorkspaceId,
    userIds,
  }: {
    workspaceId: string;
    userIds: string[];
  }) => {
    if (!workspaceId || incomingWorkspaceId !== workspaceId) {
      return;
    }

    queryClient.setQueryData<WorkspaceChannelsCache>(
      ["workspace-channels", workspaceId],
      (oldData) => {
        if (!oldData) {
          return oldData;
        }

        const channels = applyWorkspacePresenceToChannels(oldData.channels, userIds);
        const activeChannel = channels.find((channel) => channel.id === channelId) ?? null;

        setPresenceUserIds(activeChannel?.presenceUserIds ?? []);

        return {
          ...oldData,
          channels,
        };
      }
    );
  };

  return { handleChannelRead, handleTypingUpdate, handlePresence, handleWorkspacePresence };
}
