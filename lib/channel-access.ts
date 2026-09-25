import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function requireChannelAccess(channelId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, workspaceId: true },
  });

  if (!channel) {
    return { error: "CHANNEL_NOT_FOUND", status: 404 } as const;
  }

  const access = await requireWorkspaceAccess(channel.workspaceId);

  if ("error" in access) {
    return access;
  }

  return { channel, access };
}
