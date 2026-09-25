"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import type { ChannelWithRelations } from "@/types/channel.type";
import type { MessageWithRelations } from "@/types/message.type";

export type ChannelMessagesPage = {
  messages: MessageWithRelations[];
  nextCursor: string | null;
};

export type ChannelMessagesInfiniteData = InfiniteData<ChannelMessagesPage>;

export type WorkspaceChannelsCache = {
  channels: ChannelWithRelations[];
};

export type CacheHelpers = {
  updateMessageInCaches: (
    message: MessageWithRelations,
    incomingChannelId: string,
    appendIfMissing: boolean
  ) => void;
  updateWorkspaceChannels: (
    updater: (channel: ChannelWithRelations) => ChannelWithRelations,
    incomingChannelId: string
  ) => void;
};

export function createCacheHelpers(
  queryClient: QueryClient,
  workspaceId: string | undefined
): CacheHelpers {
  function updateMessageInCaches(
    message: MessageWithRelations,
    incomingChannelId: string,
    appendIfMissing: boolean
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
                current.id === message.id ? message : current
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
            new Map(normalizedMessages.map((current) => [current.id, current])).values()
          ).sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
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
      }
    );
  }

  function updateWorkspaceChannels(
    updater: (channel: ChannelWithRelations) => ChannelWithRelations,
    incomingChannelId: string
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
          channel.id === incomingChannelId ? updater(channel) : channel
        );

        updatedChannels.sort(
          (left, right) =>
            new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime()
        );

        return {
          ...oldData,
          channels: updatedChannels,
        };
      }
    );
  }

  return { updateMessageInCaches, updateWorkspaceChannels };
}
