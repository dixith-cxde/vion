"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket/client";

export function useChannelRoom(channelId?: string) {
  useEffect(() => {
    if (!channelId) {
      return;
    }

    const socket = getSocket();

    if (!socket) {
      return;
    }

    socket.emit("channel:join", {
      channelId,
    });

    return () => {
      socket.emit("channel:leave", {
        channelId,
      });
    };
  }, [channelId]);
}
