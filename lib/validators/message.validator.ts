import { Block } from "@blocknote/core";
import { z } from "zod";

export const sendMessageSchema = z.object({
  workspaceId: z.string().min(1),
  // channelId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
  contentJson: z.custom<Block[]>().optional(),
  parentId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const getChannelMessagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type GetChannelMessagesInput = z.infer<typeof getChannelMessagesSchema>;
