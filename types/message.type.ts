import { Prisma } from "@/lib/generated/prisma/client";

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
      };
    };
    reactions: {
      include: {
        user: true;
      };
    };
    attachments: true;
    replies: true;
  };
}>;
