import type { GitHubWorkspaceEntityDetail } from "@/lib/types/github";

export function formatRelativeDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function isGithubEntityType(
  value: string | undefined,
): value is GitHubWorkspaceEntityDetail["entityType"] {
  return [
    "GITHUB_REPOSITORY",
    "GITHUB_PULL_REQUEST",
    "GITHUB_ISSUE",
    "GITHUB_DISCUSSION",
    "GITHUB_RELEASE",
    "GITHUB_BRANCH",
    "COMMIT",
  ].includes(value ?? "");
}

export function getGithubEntityHref(
  workspaceId: string,
  entityType:
    | "GITHUB_PULL_REQUEST"
    | "GITHUB_ISSUE"
    | "GITHUB_DISCUSSION"
    | "GITHUB_RELEASE"
    | "GITHUB_BRANCH",
  externalId: string,
) {
  const entityId = `github:${entityType.toLowerCase()}:${externalId.trim().toLowerCase()}`;
  return `/workspaces/${workspaceId}/github?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`;
}
