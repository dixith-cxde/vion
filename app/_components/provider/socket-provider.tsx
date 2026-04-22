"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getSocket } from "@/lib/socket-client";

export function SocketProvider() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket(user.id);

    socket.on("notification:new", (data) => {
      console.log("New notification:", data);
    });

    return () => {
      socket.off("notification:new");
    };
  }, [user?.id]);

  return null;
}
