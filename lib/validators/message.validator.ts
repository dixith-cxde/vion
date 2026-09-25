import { Block } from "@blocknote/core";
import { MessageType } from "@/lib/generated/prisma/enums";
import { z } from "zod";

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255),
  mimeType: z.string().max(255).nullable().optional(),
  extension: z.string().max(32).nullable().optional(),
  size: z.number().int().nonnegative().nullable().optional(),
});

export const sendMessageSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
  contentJson: z.custom<Block[]>().optional(),
  parentId: z.string().optional(),
  type: z.literal(MessageType.TEXT).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const getChannelMessagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type GetChannelMessagesInput = z.infer<typeof getChannelMessagesSchema>;
