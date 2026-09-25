"use client";

import type { QueryClient } from "@tanstack/react-query";

import { mergeIncomingChannel } from "@/lib/chat/cache";

import type { ChannelWithRelations } from "@/types/channel.type";
import type { MessageWithRelations } from "@/types/message.type";

import type { CacheHelpers, WorkspaceChannelsCache } from "./chat-cache-helpers";

export type HandlerDeps = {
  queryClient: QueryClient;
  channelId: string | undefined;
  workspaceId: string | undefined;
  currentUserId: string;
  setTypingUserIds: (update: (current: string[]) => string[]) => void;
  setPresenceUserIds: (userIds: string[]) => void;
  cache: CacheHelpers;
};

export function createMessageHandlers({
  queryClient,
  channelId,
  workspaceId,
  currentUserId,
  cache: { updateMessageInCaches, updateWorkspaceChannels },
}: HandlerDeps) {
  const handleNewMessage = ({
    channelId: incomingChannelId,
    message,
  }: {
    workspaceId: string;
    channelId: string;
    message: MessageWithRelations;
  }) => {
    updateMessageInCaches(message, incomingChannelId, true);

    updateWorkspaceChannels((channel) => {
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
    }, incomingChannelId);
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

    updateWorkspaceChannels((channel) => {
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
    }, incomingChannelId);
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
        messages: channel.messages[0]?.id === message.id ? [message] : channel.messages,
        activityAt: channel.messages[0]?.id === message.id ? message.createdAt : channel.activityAt,
      }),
      incomingChannelId
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
      }
    );
  };

  return { handleNewMessage, handleChannelActivity, handleMessageReaction, handleChannelUpdated };
}
