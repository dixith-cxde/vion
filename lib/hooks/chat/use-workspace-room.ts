"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket/client";

export function useWorkspaceRoom(workspaceId: string) {
  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();

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
