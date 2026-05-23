import { ChannelType, ChannelVisibility } from "@/lib/generated/prisma/enums";
import { ChatChannelSummary } from "@/lib/chat/runtime";
import { MessageWithRelations } from "./message.type";

export type ChannelWithRelations = ChatChannelSummary;

export type ChannelWithMembers = ChannelWithRelations;

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
