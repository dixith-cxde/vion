"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket/client";
import { mergeIncomingChannel } from "@/lib/chat/cache";
import { ChannelWithRelations } from "@/types/channel.type";

type WorkspaceChannelsCache = {
  channels: ChannelWithRelations[];
};

type ChannelCreatedPayload = {
  workspaceId: string;
  channel: ChannelWithRelations;
};

export function useChannelRealtime(workspaceId: string, currentUserId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    if (!socket || !workspaceId) return;

    function handleChannelCreated({ channel }: ChannelCreatedPayload) {
      if (!currentUserId) {
        return;
      }

      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (old) => {
          if (!old) {
            return {
              channels: [mergeIncomingChannel([], channel, currentUserId)[0]],
            };
          }

          return {
            ...old,
            channels: mergeIncomingChannel(old.channels, channel, currentUserId),
          };
        }
      );
    }

    function handleChannelUpdated({ channel }: ChannelCreatedPayload) {
      if (!currentUserId) {
        return;
      }

      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (old) => {
          if (!old) {
            return {
              channels: [mergeIncomingChannel([], channel, currentUserId)[0]],
            };
          }

          return {
            ...old,
            channels: mergeIncomingChannel(old.channels, channel, currentUserId),
          };
        }
      );
    }

    socket.on("channel:created", handleChannelCreated);
    socket.on("channel:updated", handleChannelUpdated);

    return () => {
      socket.off("channel:created", handleChannelCreated);
      socket.off("channel:updated", handleChannelUpdated);
    };
  }, [currentUserId, queryClient, workspaceId]);
}
