import { Notification } from "@/lib/generated/prisma/client";

import { ChannelWithRelations } from "./channel.type";
import { MessageWithRelations } from "./message.type";

export type ServerToClientEvents = {
  /*| CHAT |*/

  "message:new": (data: {
    channelId: string;

    message: MessageWithRelations;
  }) => void;

  "typing:update": (data: {
    channelId: string;

    userId: string;

    typing: boolean;
  }) => void;

  "channel:created": (payload: {
    workspaceId: string;

    channel: ChannelWithRelations;
  }) => void;

  "channel:updated": (payload: {
    workspaceId: string;

    channel: ChannelWithRelations;
  }) => void;

  /*| NOTIFICATIONS |*/

  "notification:new": (notification: Notification) => void;

  "notification:remove": (data: { id: string }) => void;
};

export type ClientToServerEvents = {
  /*| CHAT |*/

  "channel:join": (data: { channelId: string }) => void;

  "channel:leave": (data: { channelId: string }) => void;

  "typing:start": (data: { channelId: string }) => void;

  "typing:stop": (data: { channelId: string }) => void;

  "workspace:join": (payload: { workspaceId: string }) => void;

  "workspace:leave": (payload: { workspaceId: string }) => void;
};
