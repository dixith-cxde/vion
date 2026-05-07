import { MessageWithRelations } from "./message.type";

export type ServerToClientEvents = {
  "message:new": (data: { channelId: string; message: MessageWithRelations }) => void;
  "typing:start": (data: { channelId: string; userId: string }) => void;
  "typing:stop": (data: { channelId: string; userId: string }) => void;
};

export type ClientToServerEvents = {
  "channel:join": (data: { channelId: string }) => void;
  "channel:leave": (data: { channelId: string }) => void;
};
