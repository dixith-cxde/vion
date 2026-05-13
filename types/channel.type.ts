import { Prisma } from "@/lib/generated/prisma/client";
import { ChannelType, ChannelVisibility } from "@/lib/generated/prisma/enums";
import { MessageWithRelations } from "./message.type";

const channelWithRelations = Prisma.validator<Prisma.ChannelDefaultArgs>()({
  include: {
    createdBy: true,
    messages: {
      orderBy: { createdAt: "desc" },
      take: 1,
    },
    pinnedMessages: true,
    members: {
      include: { user: { select: { id: true, name: true, imageUrl: true, username: true } } },
    },
  },
});

export type ChannelWithRelations = Prisma.ChannelGetPayload<typeof channelWithRelations>;

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
