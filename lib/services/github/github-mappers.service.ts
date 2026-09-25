import type {
  GitHubCommentSummary,
  GitHubCommitSummary,
  GitHubIssueSummary,
  GitHubPageInfo,
  GitHubPullRequestSummary,
  GitHubRepositorySummary,
  GitHubReviewSummary,
} from "@/lib/types/github";
import {
  GITHUB_API_BASE_URL,
  GitHubCommentResponse,
  GitHubCommitResponse,
  GitHubRestRepository,
  GitHubReviewResponse,
  GitHubSearchResultItem,
} from "../github.service";
export function toRepositorySummary(repository: GitHubRestRepository): GitHubRepositorySummary {
  return {
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description,
    private: repository.private,
    url: repository.html_url,
    defaultBranch: repository.default_branch,
    updatedAt: repository.updated_at,
    pushedAt: repository.pushed_at,
    stargazers: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    language: repository.language,
  };
}

export function getRepositoryFullNameFromUrl(url: string) {
  return url.replace(`${GITHUB_API_BASE_URL}/repos/`, "");
}

export function toPullRequestSummary(item: GitHubSearchResultItem): GitHubPullRequestSummary {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    state: item.state,
    url: item.html_url,
    repositoryFullName: getRepositoryFullNameFromUrl(item.repository_url),
    updatedAt: item.updated_at,
    createdAt: item.created_at,
    authorLogin: item.user?.login ?? null,
    authorAvatarUrl: item.user?.avatar_url ?? null,
  };
}

export function toIssueSummary(item: GitHubSearchResultItem): GitHubIssueSummary {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    state: item.state,
    url: item.html_url,
    repositoryFullName: getRepositoryFullNameFromUrl(item.repository_url),
    updatedAt: item.updated_at,
    createdAt: item.created_at,
    authorLogin: item.user?.login ?? null,
    authorAvatarUrl: item.user?.avatar_url ?? null,
  };
}

export function toCommitSummary(
  repositoryFullName: string,
  commit: GitHubCommitResponse
): GitHubCommitSummary {
  return {
    sha: commit.sha,
    message: commit.commit.message.split("\n")[0] ?? commit.sha.slice(0, 7),
    url: commit.html_url,
    committedAt: commit.commit.author?.date ?? null,
    authorName: commit.commit.author?.name ?? null,
    repositoryFullName,
  };
}

export function toCommentSummary(comment: GitHubCommentResponse): GitHubCommentSummary {
  return {
    id: comment.id,
    body: comment.body ?? null,
    url: comment.html_url,
    authorLogin: comment.user?.login ?? null,
    authorAvatarUrl: comment.user?.avatar_url ?? null,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
}

export function toReviewSummary(review: GitHubReviewResponse): GitHubReviewSummary {
  return {
    id: review.id,
    state: review.state,
    body: review.body ?? null,
    url: review.html_url,
    authorLogin: review.user?.login ?? null,
    submittedAt: review.submitted_at,
  };
}

export function splitRepositoryFullName(fullName: string) {
  const [owner, repo] = fullName.split("/");

  if (!owner || !repo) {
    throw new Error("Repository name must be in owner/repo format");
  }

  return {
    owner,
    repo,
  };
}

export function buildPaginationInfo(params: {
  page: number;
  perPage: number;
  itemCount: number;
  totalCount?: number | null;
}): GitHubPageInfo {
  return {
    page: params.page,
    perPage: params.perPage,
    hasNextPage: params.itemCount >= params.perPage,
    totalCount: params.totalCount ?? null,
  };
}

export function getWorkspaceRepositoryScopedQuery(
  connectedRepositoryFullName: string | null,
  fallback: string
) {
  if (!connectedRepositoryFullName) {
    return fallback;
  }

  return `repo:${connectedRepositoryFullName} ${fallback}`;
}
