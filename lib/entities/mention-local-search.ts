import { prisma } from "@/lib/prisma";
import { GITHUB_EXTERNAL_TYPES } from "./mention";
export async function fetchLocalMentionCandidates(
  workspaceId: string,
  query: string,
  limit: number
) {
  const workspaceRepositoryMapping = await prisma.externalMapping.findFirst({
    where: {
      entityType: "WORKSPACE",
      entityId: workspaceId,
      externalType: "GITHUB_REPOSITORY",
    },
    select: {
      externalId: true,
    },
  });
  const connectedRepositoryFullName = workspaceRepositoryMapping?.externalId ?? null;

  const [tasks, documents, channels, users, commits, githubMappings] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId,
        ...(query
          ? {
              title: {
                contains: query,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    }),
    prisma.document.findMany({
      where: {
        workspaceId,
        ...(query
          ? {
              title: {
                contains: query,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        summary: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    }),
    prisma.channel.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        isArchived: false,
        ...(query
          ? {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  slug: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    }),
    prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        ...(query
          ? {
              user: {
                OR: [
                  {
                    name: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    username: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    email: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            }
          : {}),
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
      take: limit,
    }),
    prisma.commit.findMany({
      where: {
        workspaceId,
        ...(query
          ? {
              message: {
                contains: query,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      select: {
        id: true,
        message: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    }),
    prisma.externalMapping.findMany({
      where: {
        AND: [
          {
            entityType: {
              in: Array.from(GITHUB_EXTERNAL_TYPES),
            },
          },
          ...(connectedRepositoryFullName
            ? [
                {
                  OR: [
                    {
                      entityType: "GITHUB_REPOSITORY",
                      externalId: connectedRepositoryFullName,
                    },
                    {
                      externalId: {
                        contains: connectedRepositoryFullName,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              ]
            : []),
          ...(query
            ? [
                {
                  externalId: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        entityType: true,
        externalId: true,
      },
      take: limit,
      orderBy: {
        externalId: "asc",
      },
    }),
  ]);

  const githubActivity = githubMappings.length
    ? await prisma.activity.findMany({
        where: {
          entityType: {
            in: Array.from(GITHUB_EXTERNAL_TYPES),
          },
          entityId: {
            in: githubMappings.map((mapping) => mapping.id),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  const githubMetadataByEntityId = new Map<string, unknown>();

  githubActivity.forEach((activity) => {
    if (!githubMetadataByEntityId.has(activity.entityId)) {
      githubMetadataByEntityId.set(activity.entityId, activity.metadata);
    }
  });
  return {
    tasks,
    documents,
    channels,
    users,
    commits,
    githubMappings,
    githubMetadataByEntityId,
    connectedRepositoryFullName,
  };
}
