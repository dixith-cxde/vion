import { prisma } from "@/lib/prisma";
import { UniversalEntityType } from "./mention";
import { GITHUB_EXTERNAL_TYPES, parseUniversalMentionToken } from "./mention";
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
      token
    ): token is {
      entityType: "COMMIT" | "GITHUB_REPOSITORY" | "GITHUB_PULL_REQUEST" | "GITHUB_ISSUE";
      value: string;
    } =>
      token.entityType === "COMMIT" ||
      token.entityType === "GITHUB_REPOSITORY" ||
      token.entityType === "GITHUB_PULL_REQUEST" ||
      token.entityType === "GITHUB_ISSUE"
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
