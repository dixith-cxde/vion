import {
  MentionEntityRecord,
  UniversalEntityType,
  fetchLocalMentionCandidates,
  getEntityHref,
  getGithubEntityLabel,
  getGithubEntityPreview,
  normalizeQuery,
} from "./mention";
export async function searchWorkspaceMentionEntities(params: {
  workspaceId: string;
  query?: string;
  limit?: number;
}) {
  const workspaceId = params.workspaceId;
  const query = normalizeQuery(params.query ?? "");
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 30);
  const { tasks, documents, channels, users, commits, githubMappings, githubMetadataByEntityId } =
    await fetchLocalMentionCandidates(workspaceId, query, limit);

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
      matchText: [channel.name, channel.slug, channel.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
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
          href: getEntityHref(
            workspaceId,
            entity.entityType as UniversalEntityType,
            entity.entityId
          ),
          matchText: `${entity.externalId} ${entity.label} ${entity.preview}`.toLowerCase(),
        })),
      ];
    } catch {
      // Keep local mention results available even if GitHub search fails.
    }
  }

  const filtered = query ? entities.filter((entity) => entity.matchText.includes(query)) : entities;

  return filtered
    .filter(
      (entity, index, current) =>
        current.findIndex(
          (candidate) =>
            candidate.entityType === entity.entityType && candidate.entityId === entity.entityId
        ) === index
    )
    .slice(0, limit);
}
