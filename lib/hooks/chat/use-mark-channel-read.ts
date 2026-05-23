"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

type MarkChannelReadPayload = {
  workspaceId: string;
  messageId?: string | null;
};

async function markChannelRead({
  channelId,
  payload,
}: {
  channelId: string;
  payload: MarkChannelReadPayload;
}) {
  const response = await fetch(`/api/channels/${channelId}/read`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to mark channel as read");
  }

  return response.json();
}

export function useMarkChannelRead({
  channelId,
  workspaceId,
  latestMessageId,
  lastReadMessageId,
}: {
  channelId?: string;
  workspaceId: string;
  latestMessageId?: string | null;
  lastReadMessageId?: string | null;
}) {
  const mutation = useMutation({
    mutationFn: (payload: MarkChannelReadPayload) =>
      markChannelRead({
        channelId: channelId ?? "",
        payload,
      }),
  });

  useEffect(() => {
    if (
      !channelId ||
      !latestMessageId ||
      latestMessageId === lastReadMessageId ||
      mutation.isPending
    ) {
      return;
    }

    void mutation.mutateAsync({
      workspaceId,
      messageId: latestMessageId,
    });
  }, [channelId, lastReadMessageId, latestMessageId, mutation, workspaceId]);

  return mutation;
}
