"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getSocket } from "@/lib/socket-client";

export function SocketProvider() {
  const { user } = useUser();

  useEffect(() => {
    console.log("SocketProvider mounted", user?.id);
    if (!user?.id) return;

    const socket = getSocket(user.id);

    socket.on("connect", () => {
      console.log("CONNECTED:", socket.id);
    });

    socket.on("notification:new", (data) => {
      console.log("SOCKET RECEIVED:", data);
      window.dispatchEvent(
        new CustomEvent("notification:new", {
          detail: data,
        }),
      );
    });

    socket.on("notification:remove", (data) => {
      window.dispatchEvent(
        new CustomEvent("notification:remove", {
          detail: data,
        }),
      );
    });
    return () => {
      socket.off("notification:new");
      socket.off("notification:remove");
    };
  }, [user?.id]);

  return null;
}
