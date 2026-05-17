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

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: ["workspace-channels", workspaceId],
      });

      const previousChannels = queryClient.getQueryData<WorkspaceChannelsCache>([
        "workspace-channels",
        workspaceId,
      ]);

      const optimisticChannel: ChannelWithRelations = {
        id: crypto.randomUUID(),

        name: payload.name,

        slug: payload.name.toLowerCase().trim().replace(/\s+/g, "-"),

        description: payload.description ?? null,

        topic: null,

        icon: null,

        type: payload.type,

        visibility: payload.visibility,

        dmKey: null,

        entityType: null,

        entityId: null,

        position: 0,

        isDefault: false,

        isArchived: false,

        workspaceId,

        createdById: "",

        archivedAt: null,

        archivedById: null,

        createdAt: new Date(),

        updatedAt: new Date(),

        deletedAt: null,

        members: [],

        messages: [],

        pinnedMessages: [],
      } as ChannelWithRelations;

      queryClient.setQueryData<WorkspaceChannelsCache>(
        ["workspace-channels", workspaceId],
        (old) => {
          if (!old) {
            return {
              channels: [optimisticChannel],
            };
          }

          return {
            ...old,

            channels: [optimisticChannel, ...old.channels],
          };
        }
      );

      return {
        previousChannels,
      };
    },

    onError: (_error, _payload, context) => {
      if (!context?.previousChannels) {
        return;
      }

      queryClient.setQueryData(["workspace-channels", workspaceId], context.previousChannels);
    },

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

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-channels", workspaceId],
      });
    },
  });
}
