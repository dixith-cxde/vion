"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket/client";
import { createCacheHelpers } from "./chat-cache-helpers";
import { createMessageHandlers } from "./chat-message-handlers";
import { createPresenceHandlers } from "./chat-presence-handlers";

interface UseChatRealtimeOptions {
  channelId?: string;
  workspaceId?: string;
  currentUserId: string;
}

export function useChatRealtime({ channelId, workspaceId, currentUserId }: UseChatRealtimeOptions) {
  const queryClient = useQueryClient();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [presenceUserIds, setPresenceUserIds] = useState<string[]>([]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const cache = createCacheHelpers(queryClient, workspaceId);
    const deps = {
      queryClient,
      channelId,
      workspaceId,
      currentUserId,
      setTypingUserIds,
      setPresenceUserIds,
      cache,
    };

    const { handleNewMessage, handleChannelActivity, handleMessageReaction, handleChannelUpdated } =
      createMessageHandlers(deps);
    const { handleChannelRead, handleTypingUpdate, handlePresence, handleWorkspacePresence } =
      createPresenceHandlers(deps);

    socket.on("message:new", handleNewMessage);
    socket.on("channel:activity", handleChannelActivity);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("message:pinned", handleMessageReaction);
    socket.on("channel:updated", handleChannelUpdated);
    socket.on("channel:read", handleChannelRead);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("channel:presence", handlePresence);
    socket.on("workspace:presence", handleWorkspacePresence);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("channel:activity", handleChannelActivity);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("message:pinned", handleMessageReaction);
      socket.off("channel:updated", handleChannelUpdated);
      socket.off("channel:read", handleChannelRead);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("channel:presence", handlePresence);
      socket.off("workspace:presence", handleWorkspacePresence);
    };
  }, [channelId, currentUserId, queryClient, workspaceId]);

  return {
    typingUserIds,
    presenceUserIds,
  };
}
