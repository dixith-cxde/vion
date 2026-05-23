"use client";

import { useEffect, useState } from "react";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  applyWorkspacePresenceToChannels,
  mergeIncomingChannel,
} from "@/lib/chat/cache";
import { getSocket } from "@/lib/socket/client";
import { ChannelWithRelations } from "@/types/channel.type";
import { MessageWithRelations } from "@/types/message.type";

type ChannelMessagesPage = {
  messages: MessageWithRelations[];
  nextCursor: string | null;
};

type ChannelMessagesInfiniteData = InfiniteData<ChannelMessagesPage>;

type WorkspaceChannelsCache = {
  channels: ChannelWithRelations[];
};

interface UseChatRealtimeOptions {
  channelId?: string;
  workspaceId?: string;
  currentUserId: string;
}

export function useChatRealtime({ channelId, workspaceId, currentUserId }: UseChatRealtimeOptions) {
  const queryClient = useQueryClient();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [presenceUserIds, setPresenceUserIds] = useState<string[]>([]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    function updateMessageInCaches(
      message: MessageWithRelations,
      incomingChannelId: string,
      appendIfMissing: boolean,
    ) {
      queryClient.setQueryData<ChannelMessagesInfiniteData>(
        ["channel-messages", incomingChannelId],
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const pages = oldData.pages.map((page, pageIndex) => {
            if (pageIndex !== 0) {
              return {
                ...page,
                messages: page.messages.map((current) =>
                  current.id === message.id ? message : current,
                ),
              };
            }

            const existingIndex = page.messages.findIndex((current) => current.id === message.id);
            const normalizedMessages =
              existingIndex >= 0
                ? page.messages.map((current) => (current.id === message.id ? message : current))
                : appendIfMissing
                  ? [...page.messages, message]
                  : page.messages;
            const uniqueMessages = Array.from(
              new Map(normalizedMessages.map((current) => [current.id, current])).values(),
            ).sort(
              (left, right) =>
                new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
            );

            return {
              ...page,
              messages: uniqueMessages,
            };
          });

          return {
            ...oldData,
            pages,
          };
        },
      );
    }

    function updateWorkspaceChannels(
      updater: (channel: ChannelWithRelations) => ChannelWithRelations,
      incomingChannelId: string,
    ) {
      if (!workspaceId) {
        return;
      }

      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const updatedChannels = oldData.channels.map((channel) =>
            channel.id === incomingChannelId ? updater(channel) : channel,
          );

          updatedChannels.sort(
            (left, right) =>
              new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime(),
          );

          return {
            ...oldData,
            channels: updatedChannels,
          };
        },
      );
    }

    const handleNewMessage = ({
      channelId: incomingChannelId,
      message,
    }: {
      workspaceId: string;
      channelId: string;
      message: MessageWithRelations;
    }) => {
      updateMessageInCaches(message, incomingChannelId, true);

      updateWorkspaceChannels(
        (channel) => {
          const unreadCount =
            incomingChannelId === channelId || message.authorId === currentUserId
              ? channel.unreadCount
              : channel.unreadCount + 1;

          return {
            ...channel,
            messages: [message],
            activityAt: message.createdAt,
            updatedAt: message.createdAt,
            unreadCount,
          };
        },
        incomingChannelId,
      );
    };

    const handleChannelActivity = ({
      workspaceId: incomingWorkspaceId,
      channelId: incomingChannelId,
      message,
    }: {
      workspaceId: string;
      channelId: string;
      message: MessageWithRelations;
    }) => {
      if (!workspaceId || incomingWorkspaceId !== workspaceId) {
        return;
      }

      updateWorkspaceChannels(
        (channel) => {
          const unreadCount =
            incomingChannelId === channelId || message.authorId === currentUserId
              ? channel.unreadCount
              : channel.unreadCount + 1;

          return {
            ...channel,
            messages: [message],
            activityAt: message.createdAt,
            updatedAt: message.createdAt,
            unreadCount,
          };
        },
        incomingChannelId,
      );
    };

    const handleMessageReaction = ({
      channelId: incomingChannelId,
      message,
    }: {
      channelId: string;
      message: MessageWithRelations;
    }) => {
      updateMessageInCaches(message, incomingChannelId, false);
      updateWorkspaceChannels(
        (channel) => ({
          ...channel,
          messages:
            channel.messages[0]?.id === message.id
              ? [message]
              : channel.messages,
          activityAt:
            channel.messages[0]?.id === message.id ? message.createdAt : channel.activityAt,
        }),
        incomingChannelId,
      );
    };

    const handleChannelUpdated = ({
      workspaceId: incomingWorkspaceId,
      channel,
    }: {
      workspaceId: string;
      channel: ChannelWithRelations;
    }) => {
      if (!workspaceId || incomingWorkspaceId !== workspaceId) {
        return;
      }

      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (oldData) => {
          if (!oldData) {
            return {
              channels: [mergeIncomingChannel([], channel, currentUserId)[0]],
            };
          }

          return {
            ...oldData,
            channels: mergeIncomingChannel(oldData.channels, channel, currentUserId),
          };
        },
      );
    };

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
        incomingChannelId,
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
                if (
                  new Date(message.createdAt).getTime() >
                  new Date(lastReadAt).getTime()
                ) {
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
        },
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

      updateWorkspaceChannels(
        (channel) => {
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
        },
        incomingChannelId,
      );
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
          incomingChannelId,
        );
        return;
      }

      setPresenceUserIds(userIds);
      updateWorkspaceChannels(
        (channel) => ({
          ...channel,
          presenceUserIds: userIds,
        }),
        incomingChannelId,
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
        },
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("channel:activity", handleChannelActivity);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("message:pinned", handleMessageReaction);
    socket.on("channel:updated", handleChannelUpdated);
    socket.on("channel:read", handleChannelRead);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("channel:presence", handlePresence);
    socket.on("workspace:presence", handleWorkspacePresence);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("channel:activity", handleChannelActivity);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("message:pinned", handleMessageReaction);
      socket.off("channel:updated", handleChannelUpdated);
      socket.off("channel:read", handleChannelRead);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("channel:presence", handlePresence);
      socket.off("workspace:presence", handleWorkspacePresence);
    };
  }, [channelId, currentUserId, queryClient, workspaceId]);

  return {
    typingUserIds,
    presenceUserIds,
  };
}
