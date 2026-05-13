"use client";

import { useEffect } from "react";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket/client";
import { MessageWithRelations } from "@/types/message.type";

type ChannelMessagesPage = {
  messages: MessageWithRelations[];
  nextCursor: string | null;
};

type ChannelMessagesInfiniteData = InfiniteData<ChannelMessagesPage>;

type MessageNewEventPayload = {
  channelId: string;
  message: MessageWithRelations;
};

interface UseChatRealtimeOptions {
  channelId?: string;
}

export function useChatRealtime({ channelId }: UseChatRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId) {
      return;
    }

    const handleNewMessage = ({
      channelId: incomingChannelId,
      message,
    }: MessageNewEventPayload) => {
      if (incomingChannelId !== channelId) {
        return;
      }

      queryClient.setQueryData<ChannelMessagesInfiniteData>(
        ["channel-messages", channelId],
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const firstPage = oldData.pages[0];

          if (!firstPage) {
            return oldData;
          }

          const normalizedMessages = [...firstPage.messages, message].filter(
            (currentMessage): currentMessage is MessageWithRelations => Boolean(currentMessage?.id)
          );

          const uniqueMessages = Array.from(
            new Map(
              normalizedMessages.map((currentMessage) => [currentMessage.id, currentMessage])
            ).values()
          );

          const updatedFirstPage: ChannelMessagesPage = {
            ...firstPage,
            messages: uniqueMessages,
          };

          return {
            ...oldData,

            pages: [updatedFirstPage, ...oldData.pages.slice(1)],
          };
        }
      );
    };

    let connectedSocket: ReturnType<typeof getSocket> | null = null;

    const interval = setInterval(() => {
      const socket = getSocket();

      if (!socket) {
        return;
      }

      connectedSocket = socket;

      socket.on("message:new", handleNewMessage);

      clearInterval(interval);
    }, 300);

    return () => {
      clearInterval(interval);

      connectedSocket?.off("message:new", handleNewMessage);
    };
  }, [channelId, queryClient]);
}
