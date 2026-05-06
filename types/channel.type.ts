import { Prisma } from '@/lib/generated/prisma/client';
import { ChannelType } from '@/lib/services/channel.service';

export type ChannelWithMembers = Prisma.ChannelGetPayload<{
  include: { members: { include: { user: true } } };
}>;

export type CreateChannelRequest = {
  workspaceId: string;
  name: string;
  type: Extract<ChannelType, 'GROUP' | 'PUBLIC' | 'PRIVATE'>;
  memberIds?: string[];
};
