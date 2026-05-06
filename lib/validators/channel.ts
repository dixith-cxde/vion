import { z } from 'zod';

export const createChannelSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(['GROUP']),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  memberIds: z.array(z.string()).default([]),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const createDMChannelSchema = z.object({
  workspaceId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export type CreateDMChannelInput = z.infer<typeof createDMChannelSchema>;

export const createSelfChannelSchema = z.object({
  workspaceId: z.string().min(1),
});

export type CreateSelfChannelInput = z.infer<typeof createSelfChannelSchema>;
