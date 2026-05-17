"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket/client";
import { ChannelWithRelations } from "@/types/channel.type";

type WorkspaceChannelsCache = {
  channels: ChannelWithRelations[];
};

type ChannelCreatedPayload = {
  workspaceId: string;
  channel: ChannelWithRelations;
};

export function useChannelRealtime(workspaceId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    if (!socket || !workspaceId) return;

    function handleChannelCreated({ channel }: ChannelCreatedPayload) {
      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (old) => {
          if (!old)
            return {
              channels: [channel],
            };

          const exists = old.channels.some((existingChannel) => existingChannel.id === channel.id);

          if (exists) return old;

          return {
            ...old,

            channels: [channel, ...old.channels],
          };
        }
      );
    }

    socket.on("channel:created", handleChannelCreated);

    return () => {
      socket.off("channel:created", handleChannelCreated);
    };
  }, [queryClient, workspaceId]);
}
