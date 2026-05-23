import { prisma } from "@/lib/prisma";

export const UNIVERSAL_ENTITY_TYPES = [
  "USER",
  "TASK",
  "DOCUMENT",
  "CHANNEL",
  "MESSAGE",
  "COMMIT",
  "GITHUB_REPOSITORY",
  "GITHUB_PULL_REQUEST",
  "GITHUB_ISSUE",
  "GITHUB_DISCUSSION",
  "GITHUB_RELEASE",
  "GITHUB_BRANCH",
] as const;

export type UniversalEntityType = (typeof UNIVERSAL_ENTITY_TYPES)[number];

export type MentionEntityRecord = {
  entityType: UniversalEntityType;
  entityId: string;
  label: string;
  preview: string;
  href: string;
  matchText: string;
};

const GITHUB_EXTERNAL_TYPES = new Set<UniversalEntityType>([
  "GITHUB_REPOSITORY",
  "GITHUB_PULL_REQUEST",
  "GITHUB_ISSUE",
  "GITHUB_DISCUSSION",
  "GITHUB_RELEASE",
  "GITHUB_BRANCH",
]);

const GITHUB_TOKEN_PREFIX_MAP = {
  repo: "GITHUB_REPOSITORY",
  pr: "GITHUB_PULL_REQUEST",
  issue: "GITHUB_ISSUE",
  discussion: "GITHUB_DISCUSSION",
  release: "GITHUB_RELEASE",
  branch: "GITHUB_BRANCH",
  commit: "COMMIT",
} as const;

type TokenPrefix = keyof typeof GITHUB_TOKEN_PREFIX_MAP;

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function normalizeExternalValue(value: string) {
  return value.trim().toLowerCase();
}

function getGithubEntityLabel(type: UniversalEntityType, externalId: string, metadata?: unknown) {
  const record =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null;
  const title = typeof record?.title === "string" ? record.title : null;

  if (title) {
    return title;
  }

  switch (type) {
    case "GITHUB_REPOSITORY":
      return externalId;
    case "GITHUB_PULL_REQUEST":
      return `PR ${externalId}`;
    case "GITHUB_ISSUE":
      return `Issue ${externalId}`;
    case "GITHUB_DISCUSSION":
      return `Discussion ${externalId}`;
    case "GITHUB_RELEASE":
      return `Release ${externalId}`;
    case "GITHUB_BRANCH":
      return `Branch ${externalId}`;
    default:
      return externalId;
  }
}

function getGithubEntityPreview(type: UniversalEntityType, externalId: string, metadata?: unknown) {
  const record =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null;
  const repository = typeof record?.repositoryFullName === "string" ? record.repositoryFullName : null;
  const subtitle = typeof record?.subtitle === "string" ? record.subtitle : null;

  if (subtitle) {
    return subtitle;
  }

  const base =
    repository ??
    (type === "GITHUB_REPOSITORY" ? "GitHub repository" : "GitHub entity");

  return `${base} • ${externalId}`;
}

export function getEntityHref(
  workspaceId: string,
  entityType: UniversalEntityType,
  entityId: string,
  extra?: Record<string, string | undefined>,
) {
  const query = new URLSearchParams(
    Object.entries(extra ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  switch (entityType) {
    case "TASK":
      return `/workspaces/${workspaceId}/tasks/${entityId}`;
    case "DOCUMENT":
      return `/workspaces/${workspaceId}/documents/${entityId}`;
    case "CHANNEL":
      query.set("channelId", entityId);
      return `/workspaces/${workspaceId}/chat?${query.toString()}`;
    case "MESSAGE":
      query.set("messageId", entityId);
      return `/workspaces/${workspaceId}/chat?${query.toString()}`;
    case "COMMIT":
    case "USER":
      query.set("entityType", entityType);
      query.set("entityId", entityId);
      return `/workspaces/${workspaceId}/graph?${query.toString()}`;
    case "GITHUB_REPOSITORY":
    case "GITHUB_PULL_REQUEST":
    case "GITHUB_ISSUE":
    case "GITHUB_DISCUSSION":
    case "GITHUB_RELEASE":
    case "GITHUB_BRANCH":
      query.set("entityType", entityType);
      query.set("entityId", entityId);
      return `/workspaces/${workspaceId}/github?${query.toString()}`;
    default:
      return `/workspaces/${workspaceId}/graph`;
  }
}

export function extractUniversalMentionTokens(content: string) {
  const matches = content.match(/(^|\s)@([a-zA-Z0-9._/-]{2,120})/g) ?? [];

  return Array.from(
    new Set(
      matches
        .map((token) => token.trim().slice(1))
        .map((token) => token.toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function parseUniversalMentionToken(token: string) {
  const normalized = normalizeQuery(token);
  const [prefix, ...rest] = normalized.split("/");

  if (!prefix || rest.length === 0) {
    return null;
  }

  if (!(prefix in GITHUB_TOKEN_PREFIX_MAP)) {
    return null;
  }

  const value = rest.join("/").trim();

  if (!value) {
    return null;
  }

  return {
    entityType: GITHUB_TOKEN_PREFIX_MAP[prefix as TokenPrefix] as UniversalEntityType,
    value,
  };
}

export async function upsertGitHubEntityReference(params: {
  type: Extract<UniversalEntityType, `GITHUB_${string}`>;
  externalId: string;
  title?: string | null;
  repositoryFullName?: string | null;
  subtitle?: string | null;
}) {
  const normalizedExternalId = params.externalId.trim();
  const mappingId = `github:${params.type.toLowerCase()}:${normalizeExternalValue(normalizedExternalId)}`;

  await prisma.activity.create({
    data: {
      entityType: params.type,
      entityId: mappingId,
      action: "GITHUB_ENTITY_REGISTERED",
      metadata: {
        title: params.title ?? null,
        repositoryFullName: params.repositoryFullName ?? null,
        subtitle: params.subtitle ?? null,
      },
    },
  });

  return prisma.externalMapping.upsert({
    where: {
      id: mappingId,
    },
    update: {
      externalId: normalizedExternalId,
      externalType: params.type,
      entityType: params.type,
      entityId: mappingId,
    },
    create: {
      id: mappingId,
      externalId: normalizedExternalId,
      externalType: params.type,
      entityType: params.type,
      entityId: mappingId,
    },
  });
}

export async function resolveUniversalMentionEntities(workspaceId: string, tokens: string[]) {
  const parsedTokens = tokens
    .map((token) => parseUniversalMentionToken(token))
    .filter((token): token is NonNullable<typeof token> => Boolean(token));

  const commitTokens = parsedTokens
    .filter((token) => token.entityType === "COMMIT")
    .map((token) => token.value);
  const githubTokens = parsedTokens.filter((token) => GITHUB_EXTERNAL_TYPES.has(token.entityType));

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

  const [commitMappings, githubMappings] = await Promise.all([
    commitTokens.length
      ? prisma.externalMapping.findMany({
          where: {
            entityType: "COMMIT",
            externalType: "GITHUB_COMMIT",
            OR: commitTokens.map((token) => ({
              externalId: {
                startsWith: token,
                mode: "insensitive" as const,
              },
            })),
          },
          select: {
            entityId: true,
            externalId: true,
          },
        })
      : Promise.resolve([]),
    githubTokens.length
      ? prisma.externalMapping.findMany({
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
              {
                OR: githubTokens.map((token) => ({
                  entityType: token.entityType,
                  externalId: {
                    contains: token.value,
                    mode: "insensitive" as const,
                  },
                })),
              },
            ],
          },
          select: {
            id: true,
            entityType: true,
            externalId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const commitMatches = commitMappings.map((mapping) => ({
    entityType: "COMMIT" as const,
    entityId: mapping.entityId,
    matchText: mapping.externalId.toLowerCase(),
  }));

  const githubMatches = githubMappings.map((mapping) => ({
    entityType: mapping.entityType as UniversalEntityType,
    entityId: mapping.id,
    matchText: mapping.externalId.toLowerCase(),
  }));

  const supportedRemoteTokens = parsedTokens.filter(
    (
      token,
    ): token is {
      entityType:
        | "COMMIT"
        | "GITHUB_REPOSITORY"
        | "GITHUB_PULL_REQUEST"
        | "GITHUB_ISSUE";
      value: string;
    } =>
      token.entityType === "COMMIT" ||
      token.entityType === "GITHUB_REPOSITORY" ||
      token.entityType === "GITHUB_PULL_REQUEST" ||
      token.entityType === "GITHUB_ISSUE",
  );

  if (supportedRemoteTokens.length === 0) {
    return [...commitMatches, ...githubMatches];
  }

  try {
    const { resolveGithubMentionTokens } = await import("@/lib/services/github.service");
    const remoteMatches = await resolveGithubMentionTokens({
      workspaceId,
      tokens: supportedRemoteTokens,
    });

    const normalizedRemoteMatches = remoteMatches.map((match) => ({
      entityType: match.entityType as UniversalEntityType,
      entityId: match.entityId,
      matchText: match.externalId.toLowerCase(),
    }));

    const resolvedKeys = new Set<string>();

    return [...commitMatches, ...githubMatches, ...normalizedRemoteMatches].filter((match) => {
      const key = `${match.entityType}:${match.entityId}:${match.matchText}`;

      if (resolvedKeys.has(key)) {
        return false;
      }

      resolvedKeys.add(key);
      return true;
    });
  } catch {
    return [...commitMatches, ...githubMatches];
  }
}

export async function searchWorkspaceMentionEntities(params: {
  workspaceId: string;
  query?: string;
  limit?: number;
}) {
  const workspaceId = params.workspaceId;
  const query = normalizeQuery(params.query ?? "");
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 30);
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

  let entities: MentionEntityRecord[] = [
    ...users.map(({ user }) => ({
      entityType: "USER" as const,
      entityId: user.id,
      label: user.name?.trim() || user.username?.trim() || user.email,
      preview: user.username ? `@${user.username}` : user.email,
      href: getEntityHref(workspaceId, "USER", user.id),
      matchText: [user.name, user.username, user.email].filter(Boolean).join(" ").toLowerCase(),
    })),
    ...tasks.map((task) => ({
      entityType: "TASK" as const,
      entityId: task.id,
      label: task.title,
      preview: "Task",
      href: getEntityHref(workspaceId, "TASK", task.id),
      matchText: task.title.toLowerCase(),
    })),
    ...documents.map((document) => ({
      entityType: "DOCUMENT" as const,
      entityId: document.id,
      label: document.title,
      preview: document.summary?.trim() || "Document",
      href: getEntityHref(workspaceId, "DOCUMENT", document.id),
      matchText: `${document.title} ${document.summary ?? ""}`.toLowerCase(),
    })),
    ...channels.map((channel) => ({
      entityType: "CHANNEL" as const,
      entityId: channel.id,
      label: channel.name?.trim() || channel.slug?.trim() || "Conversation",
      preview: channel.description?.trim() || "Channel",
      href: getEntityHref(workspaceId, "CHANNEL", channel.id),
      matchText: [channel.name, channel.slug, channel.description].filter(Boolean).join(" ").toLowerCase(),
    })),
    ...commits.map((commit) => ({
      entityType: "COMMIT" as const,
      entityId: commit.id,
      label: commit.message,
      preview: "Commit",
      href: getEntityHref(workspaceId, "COMMIT", commit.id),
      matchText: commit.message.toLowerCase(),
    })),
    ...githubMappings.map((mapping) => {
      const entityType = mapping.entityType as UniversalEntityType;
      const metadata = githubMetadataByEntityId.get(mapping.id);

      return {
        entityType,
        entityId: mapping.id,
        label: getGithubEntityLabel(entityType, mapping.externalId, metadata),
        preview: getGithubEntityPreview(entityType, mapping.externalId, metadata),
        href: getEntityHref(workspaceId, entityType, mapping.id),
        matchText: `${mapping.externalId} ${JSON.stringify(metadata ?? {})}`.toLowerCase(),
      };
    }),
  ];

  if (query) {
    try {
      const { searchGithubWorkspaceEntities } = await import("@/lib/services/github.service");
      const remoteEntities = await searchGithubWorkspaceEntities({
        workspaceId,
        query,
        limit,
      });

      entities = [
        ...entities,
        ...remoteEntities.map((entity) => ({
          entityType: entity.entityType as UniversalEntityType,
          entityId: entity.entityId,
          label: entity.label,
          preview: entity.preview,
          href: getEntityHref(workspaceId, entity.entityType as UniversalEntityType, entity.entityId),
          matchText: `${entity.externalId} ${entity.label} ${entity.preview}`.toLowerCase(),
        })),
      ];
    } catch {
      // Keep local mention results available even if GitHub search fails.
    }
  }

  const filtered = query
    ? entities.filter((entity) => entity.matchText.includes(query))
    : entities;

  return filtered
    .filter((entity, index, current) =>
      current.findIndex(
        (candidate) =>
          candidate.entityType === entity.entityType && candidate.entityId === entity.entityId,
      ) === index,
    )
    .slice(0, limit);
}
