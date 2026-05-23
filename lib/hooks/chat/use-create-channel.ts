"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChannelWithRelations, CreateChannelRequest } from "@/types/channel.type";

type CreateChannelResponse = {
  channel: ChannelWithRelations;
};

type WorkspaceChannelsCache = {
  channels: ChannelWithRelations[];
};

async function createChannelRequest(payload: CreateChannelRequest): Promise<CreateChannelResponse> {
  const response = await fetch("/api/channels", {
    method: "POST",

    credentials: "include",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();

    throw new Error(data.error || "Failed to create channel");
  }

  return response.json();
}

export function useCreateChannel(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChannelRequest,

    onSuccess: ({ channel }) => {
      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (old) => {
          if (!old) {
            return {
              channels: [channel],
            };
          }

          const filteredChannels = old.channels.filter(
            (existingChannel) =>
              existingChannel.id !== channel.id &&
              !(existingChannel.name === channel.name && existingChannel.slug === channel.slug)
          );

          return {
            ...old,

            channels: [channel, ...filteredChannels],
          };
        }
      );
    },
  });
}
