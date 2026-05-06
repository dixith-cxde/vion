import { useQuery } from "@tanstack/react-query";

import { ChannelWithRelations } from "@/types/channel.type";

type WorkspaceChannelsResponse = {
  channels: ChannelWithRelations[];
  nextCursor: string | null;
};

async function fetchWorkspaceChannels(signal?: AbortSignal): Promise<WorkspaceChannelsResponse> {
  const response = await fetch("/api/channels", {
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

export function useWorkspaceChannels() {
  return useQuery({
    queryKey: ["workspace-channels"],
    queryFn: ({ signal }) => fetchWorkspaceChannels(signal),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
