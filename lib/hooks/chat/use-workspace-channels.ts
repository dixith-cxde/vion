import { useQuery } from "@tanstack/react-query";

import { ChannelWithRelations } from "@/types/channel.type";

type WorkspaceChannelsResponse = {
  channels: ChannelWithRelations[];
};

type FetchWorkspaceChannelsParams = {
  workspaceId: string;

  signal?: AbortSignal;
};

async function fetchWorkspaceChannels({
  workspaceId,
  signal,
}: FetchWorkspaceChannelsParams): Promise<WorkspaceChannelsResponse> {
  const params = new URLSearchParams({
    workspaceId,
  });

  const response = await fetch(`/api/channels?${params.toString()}`, {
    method: "GET",

    credentials: "include",

    signal,

    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch workspace channels");
  }

  return response.json();
}

export function useWorkspaceChannels(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-channels", workspaceId],

    queryFn: ({ signal }) =>
      fetchWorkspaceChannels({
        workspaceId,
        signal,
      }),

    enabled: Boolean(workspaceId),

    staleTime: 1000 * 30,

    gcTime: 1000 * 60 * 5,

    retry: 2,

    refetchOnWindowFocus: false,
  });
}
