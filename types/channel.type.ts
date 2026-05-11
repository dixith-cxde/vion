import { Prisma } from "@/lib/generated/prisma/client";
import { MessageWithRelations } from "./message.type";
import { ChannelType, ChannelVisibility } from "@/lib/services/channel.service";

export type ChannelWithMembers = Prisma.ChannelGetPayload<{
  include: { members: { include: { user: { select: { id: true; name: true; image: true } } } } };
}>;

export type ChatMessage = MessageWithRelations & {
  optimistic?: boolean;
};

export type CreateChannelRequest = {
  workspaceId: string;
  name: string;
  description?: string;
  topic?: string;
  type: Extract<ChannelType, "GROUP">;
  visibility: ChannelVisibility;
  memberIds?: string[];
};

export type ChannelWithRelations = Prisma.ChannelGetPayload<{
  include: { members: { include: { user: { select: { id: true; name: true; image: true } } } } };
}>;
