import { Notification } from "@/lib/generated/prisma/client";

import { MessageWithRelations } from "./message.type";

export type ServerToClientEvents = {
  /*| CHAT |*/
  "message:new": (data: { channelId: string; message: MessageWithRelations }) => void;
  "typing:start": (data: { channelId: string; userId: string }) => void;
  "typing:stop": (data: { channelId: string; userId: string }) => void;

  /*| NOTIFICATIONS |*/
  "notification:new": (notification: Notification) => void;
  "notification:remove": (data: { id: string }) => void;
};

export type ClientToServerEvents = {
  // -- CHAT -------------------------------------------

  "channel:join": (data: { channelId: string }) => void;
  "channel:leave": (data: { channelId: string }) => void;
};
