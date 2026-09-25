import { UniversalEntityType } from "./mention";
export function getGithubEntityLabel(
  type: UniversalEntityType,
  externalId: string,
  metadata?: unknown
) {
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

export function getGithubEntityPreview(
  type: UniversalEntityType,
  externalId: string,
  metadata?: unknown
) {
  const record =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null;
  const repository =
    typeof record?.repositoryFullName === "string" ? record.repositoryFullName : null;
  const subtitle = typeof record?.subtitle === "string" ? record.subtitle : null;

  if (subtitle) {
    return subtitle;
  }

  const base = repository ?? (type === "GITHUB_REPOSITORY" ? "GitHub repository" : "GitHub entity");

  return `${base} • ${externalId}`;
}

export function getEntityHref(
  workspaceId: string,
  entityType: UniversalEntityType,
  entityId: string,
  extra?: Record<string, string | undefined>
) {
  const query = new URLSearchParams(
    Object.entries(extra ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
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
