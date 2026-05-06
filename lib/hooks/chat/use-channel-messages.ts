import { useInfiniteQuery } from "@tanstack/react-query";
import { MessageWithRelations } from "@/types/message.type";

type GetChannelMessagesResponse = {
  messages: MessageWithRelations[];
  nextCursor: string | null;
};

type FetchChannelMessagesParams = {
  channelId: string;
  cursor?: string | null;
  signal?: AbortSignal;
};

async function fetchChannelMessages({
  channelId,
  cursor,
  signal,
}: FetchChannelMessagesParams): Promise<GetChannelMessagesResponse> {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`/api/channels/${channelId}/messages?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch channel messages");
  }

  return response.json();
}

export function useChannelMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: ["channel-messages", channelId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchChannelMessages({
        channelId,
        cursor: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(channelId),
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
