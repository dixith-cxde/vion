import { ChannelWithRelations } from "./channel.type";
import { MessageWithRelations } from "./message.type";
import { NotificationWithSender } from "./notification.type";

export type ServerToClientEvents = {
  /*| CHAT |*/

  "message:new": (data: {
    workspaceId: string;
    channelId: string;
    message: MessageWithRelations;
  }) => void;

  "channel:activity": (data: {
    workspaceId: string;
    channelId: string;
    message: MessageWithRelations;
  }) => void;

  "message:reaction": (data: {
    channelId: string;
    message: MessageWithRelations;
  }) => void;

  "message:pinned": (data: {
    channelId: string;
    message: MessageWithRelations;
  }) => void;

  "typing:update": (data: {
    channelId: string;
    userId: string;
    userName: string;
    typing: boolean;
  }) => void;

  "channel:presence": (data: {
    channelId: string;
    userIds: string[];
  }) => void;

  "workspace:presence": (data: {
    workspaceId: string;
    userIds: string[];
  }) => void;

  "channel:read": (data: {
    channelId: string;
    userId: string;
    lastReadAt: string;
    lastReadMessageId: string | null;
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

  "notification:new": (notification: NotificationWithSender) => void;

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
