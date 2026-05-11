"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { connectSocket, disconnectSocket } from "@/lib/socket/client";

export function SocketProvider() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let mounted = true;

    async function initializeRealtime() {
      try {
        const token = await getToken();

        if (!token || !mounted) {
          return;
        }

        const socket = await connectSocket(token);

        socket.on("connect", () => {
          console.log("Socket connected:", socket.id);
        });

        socket.on("notification:new", (notification) => {
          console.log("REALTIME NOTIFICATION:", notification);
          window.dispatchEvent(
            new CustomEvent("notification:new", {
              detail: notification,
            })
          );
        });

        socket.on("notification:remove", (payload) => {
          window.dispatchEvent(
            new CustomEvent("notification:remove", {
              detail: payload,
            })
          );
        });
      } catch (error) {
        console.error("Realtime initialization failed:", error);
      }
    }

    initializeRealtime();

    return () => {
      mounted = false;

      disconnectSocket();
    };
  }, [getToken, isSignedIn]);

  return null;
}
