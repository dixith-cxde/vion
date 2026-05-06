import { Prisma } from "@/lib/generated/prisma/client";

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    author: true;
    reactions: {
      include: {
        user: true;
      };
    };
    attachments: true;
    replies: true;
  };
}>;
