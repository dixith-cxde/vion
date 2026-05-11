"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket/client";

export function useChannelRoom(channelId?: string) {
  useEffect(() => {
    if (!channelId) {
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
