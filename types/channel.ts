import { Prisma } from '@/lib/generated/prisma/client';

export type ChannelWithMembers = Prisma.ChannelGetPayload<{
  include: { members: { include: { user: true } } };
}>;
