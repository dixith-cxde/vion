import { upsertGitHubEntityReference } from "@/lib/entities/mention";
import { prisma } from "@/lib/prisma";
import type { GitHubAccountSummary } from "@/lib/types/github";
export const GITHUB_ACCOUNT_TYPE = "GITHUB_ACCOUNT";
export const GITHUB_REPOSITORY_TYPE = "GITHUB_REPOSITORY";
export const GITHUB_COMMIT_TYPE = "GITHUB_COMMIT";
export const GITHUB_API_BASE_URL = "https://api.github.com";

export type ResolvedGithubAccount = {
  userId: string | null;
  summary: GitHubAccountSummary;
  accessToken: string | null;
};

export type GitHubRestRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  pushed_at: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
};

export type GitHubSearchResultItem = {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  updated_at: string;
  created_at: string;
  repository_url: string;
  user?: {
    login?: string | null;
    avatar_url?: string | null;
  } | null;
  pull_request?: Record<string, unknown>;
};

export type GitHubRestUser = {
  login?: string | null;
  avatar_url?: string | null;
};

export type GitHubCommitResponse = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: {
      name?: string | null;
      date?: string | null;
    } | null;
  };
};

export type GitHubIssueResponse = GitHubSearchResultItem & {
  body?: string | null;
  comments?: number;
};

export type GitHubPullRequestResponse = GitHubIssueResponse & {
  draft?: boolean;
  merged_at?: string | null;
  base?: {
    ref?: string | null;
  } | null;
  head?: {
    ref?: string | null;
  } | null;
};

export type GitHubBranchResponse = {
  name: string;
  protected: boolean;
};

export type GitHubReleaseResponse = {
  id: number;
  name: string | null;
  tag_name: string;
  html_url: string;
  published_at: string | null;
};

export type GitHubCommentResponse = {
  id: number;
  body?: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  user?: GitHubRestUser | null;
};

export type GitHubReviewResponse = {
  id: number;
  state: string;
  body?: string | null;
  html_url: string;
  submitted_at: string | null;
  user?: GitHubRestUser | null;
};

export type GitHubRepositorySearchResponse = {
  total_count: number;
  items: GitHubRestRepository[];
};

export type GitHubIssueSearchResponse = {
  total_count: number;
  items: GitHubSearchResultItem[];
};

export type GitHubDiscussionGraphQlResponse = {
  data?: {
    repository?: {
      discussions?: {
        nodes?: Array<{
          id: string;
          number: number;
          title: string;
          url: string;
          updatedAt: string;
          answerChosenAt: string | null;
        }>;
      };
    };
  };
  errors?: Array<{
    message?: string;
  }>;
};

export function getGithubEntityMappingId(type: `GITHUB_${string}`, externalId: string) {
  return `github:${type.toLowerCase()}:${externalId.trim().toLowerCase()}`;
}

export async function ensureGitHubEntityReference(params: {
  type:
    | "GITHUB_REPOSITORY"
    | "GITHUB_PULL_REQUEST"
    | "GITHUB_ISSUE"
    | "GITHUB_DISCUSSION"
    | "GITHUB_RELEASE"
    | "GITHUB_BRANCH";
  externalId: string;
  title?: string | null;
  repositoryFullName?: string | null;
  subtitle?: string | null;
}) {
  const mappingId = getGithubEntityMappingId(params.type, params.externalId);
  const existing = await prisma.externalMapping.findUnique({
    where: {
      id: mappingId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing;
  }

  return upsertGitHubEntityReference(params);
}
