import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const workspaces = await prisma.workspace.findMany({
    include: {
      owner: true,
      channels: true,
    },
  });

  for (const workspace of workspaces) {
    const hasGeneralChannel = workspace.channels.some((channel) => channel.type === "GROUP");

    if (!hasGeneralChannel) {
      const generalChannel = await prisma.channel.create({
        data: {
          name: "general",
          description: "General workspace discussion",

          type: "GROUP",

          visibility: "PUBLIC",

          workspaceId: workspace.id,

          createdById: workspace.ownerId,
        },
      });

      await prisma.channelMember.create({
        data: {
          channelId: generalChannel.id,

          userId: workspace.ownerId,

          role: "ADMIN",
        },
      });

      console.log(`Created general channel for workspace: ${workspace.name}`);
    }

    const hasSelfChannel = workspace.channels.some((channel) => channel.type === "SELF");

    if (!hasSelfChannel) {
      const selfChannel = await prisma.channel.create({
        data: {
          name: null,

          description: "Personal workspace channel",

          type: "SELF",

          visibility: "PRIVATE",

          workspaceId: workspace.id,

          createdById: workspace.ownerId,
        },
      });

      await prisma.channelMember.create({
        data: {
          channelId: selfChannel.id,

          userId: workspace.ownerId,

          role: "ADMIN",
        },
      });

      console.log(`Created self channel for workspace: ${workspace.name}`);
    }
  }

  console.log("Workspace channel backfill complete");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
