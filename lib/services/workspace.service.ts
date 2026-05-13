import { Prisma } from "@/lib/generated/prisma/client";

type CreateWorkspaceParams = {
  tx: Prisma.TransactionClient;

  name: string;

  ownerId: string;
};

export async function createWorkspace({ tx, name, ownerId }: CreateWorkspaceParams) {
  const workspace = await tx.workspace.create({
    data: {
      name,
      ownerId,

      members: {
        create: {
          userId: ownerId,
          role: "OWNER",
        },
      },
    },
  });

  const generalChannel = await tx.channel.create({
    data: {
      name: "general",

      description: "General workspace discussion",

      type: "GROUP",

      visibility: "PUBLIC",

      workspaceId: workspace.id,

      createdById: ownerId,
    },
  });

  const selfChannel = await tx.channel.create({
    data: {
      name: null,

      description: "Personal workspace channel",

      type: "SELF",

      visibility: "PRIVATE",

      workspaceId: workspace.id,

      createdById: ownerId,
    },
  });

  await tx.channelMember.createMany({
    data: [
      {
        channelId: generalChannel.id,

        userId: ownerId,

        role: "ADMIN",
      },

      {
        channelId: selfChannel.id,

        userId: ownerId,

        role: "ADMIN",
      },
    ],
  });

  return workspace;
}
