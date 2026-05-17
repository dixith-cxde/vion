"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket/client";

export function useWorkspaceRoom(workspaceId: string) {
  const socket = getSocket();
  useEffect(() => {
    if (!workspaceId) return;

    socket?.emit("workspace:join", {
      workspaceId,
    });

    return () => {
      socket?.emit("workspace:leave", {
        workspaceId,
      });
    };
  }, [workspaceId]);
}
