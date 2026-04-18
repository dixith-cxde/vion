import { prisma } from "@/lib/prisma";

export async function getWorkspaceDashboard(workspaceId: string) {
  const [documents, tasks, relationships] = await Promise.all([
    prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    }),

    prisma.task.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    }),

    prisma.relationship.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        sourceEntityType: true,
        targetEntityType: true,
        relationshipType: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    documents,
    tasks,
    activity: relationships,
  };
}
