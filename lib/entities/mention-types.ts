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

export const GITHUB_EXTERNAL_TYPES = new Set<UniversalEntityType>([
  "GITHUB_REPOSITORY",
  "GITHUB_PULL_REQUEST",
  "GITHUB_ISSUE",
  "GITHUB_DISCUSSION",
  "GITHUB_RELEASE",
  "GITHUB_BRANCH",
]);

export const GITHUB_TOKEN_PREFIX_MAP = {
  repo: "GITHUB_REPOSITORY",
  pr: "GITHUB_PULL_REQUEST",
  issue: "GITHUB_ISSUE",
  discussion: "GITHUB_DISCUSSION",
  release: "GITHUB_RELEASE",
  branch: "GITHUB_BRANCH",
  commit: "COMMIT",
} as const;

export type TokenPrefix = keyof typeof GITHUB_TOKEN_PREFIX_MAP;
