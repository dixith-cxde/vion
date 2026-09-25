import type { GitHubLinkedRepositoryData, GitHubWorkspaceOverview } from "@/lib/types/github";
import {
  GitHubRestRepository,
  GitHubSearchResultItem,
  fetchGitHubJson,
  fetchRepositoryDetail,
  getWorkspaceGithubConnections,
  getWorkspaceGithubRepository,
  handleGithubAccessFailure,
  registerGitHubOverviewEntities,
  resolveCurrentGithubAccount,
  toIssueSummary,
  toPullRequestSummary,
  toRepositorySummary,
} from "../github.service";
export async function getWorkspaceGithubOverview(
  workspaceId: string
): Promise<GitHubWorkspaceOverview> {
  const [resolvedAccount, workspaceRepositoryMapping, linkedRepositories] = await Promise.all([
    resolveCurrentGithubAccount(),
    getWorkspaceGithubRepository(workspaceId),
    getWorkspaceGithubConnections(workspaceId),
  ]);

  const linkedRepositoryFullName = workspaceRepositoryMapping?.externalId ?? null;

  if (!resolvedAccount.summary.connected || !resolvedAccount.accessToken) {
    return {
      account: resolvedAccount.summary,
      linkedRepository: {
        connected: Boolean(linkedRepositoryFullName),
        fullName: linkedRepositoryFullName,
      },
      linkedRepositories,
      repositories: [],
      pullRequests: [],
      issues: [],
      linkedRepositoryData: null,
      error: resolvedAccount.summary.connected
        ? resolvedAccount.summary.needsReconnect
          ? resolvedAccount.summary.authError || "GitHub access requires re-authorization."
          : "GitHub account is connected, but no repository runtime token is currently available."
        : null,
    };
  }

  try {
    const usernameQuery = resolvedAccount.summary.username
      ? ` involves:${resolvedAccount.summary.username}`
      : "";
    const [repositoriesResponse, pullRequestsResponse, issuesResponse] = await Promise.all([
      fetchGitHubJson<GitHubRestRepository[]>(
        "/user/repos?sort=updated&per_page=12&affiliation=owner,collaborator,organization_member",
        resolvedAccount.accessToken
      ),
      fetchGitHubJson<{ items: GitHubSearchResultItem[] }>(
        `/search/issues?q=${encodeURIComponent(`is:pr archived:false${usernameQuery}`)}&sort=updated&order=desc&per_page=10`,
        resolvedAccount.accessToken
      ),
      fetchGitHubJson<{ items: GitHubSearchResultItem[] }>(
        `/search/issues?q=${encodeURIComponent(`is:issue archived:false${usernameQuery}`)}&sort=updated&order=desc&per_page=10`,
        resolvedAccount.accessToken
      ),
    ]);

    const repositories = repositoriesResponse.map(toRepositorySummary);
    const pullRequests = pullRequestsResponse.items
      .filter((item) => Boolean(item.pull_request))
      .map(toPullRequestSummary);
    const issues = issuesResponse.items.filter((item) => !item.pull_request).map(toIssueSummary);

    let linkedRepositoryData: GitHubLinkedRepositoryData | null = null;

    if (linkedRepositoryFullName) {
      const repositoryDetail = await fetchRepositoryDetail(
        resolvedAccount.accessToken,
        linkedRepositoryFullName
      );
      linkedRepositoryData = {
        repository: repositoryDetail.repository,
        branches: repositoryDetail.branches,
        releases: repositoryDetail.releases,
        discussions: repositoryDetail.discussions,
        commits: repositoryDetail.commits,
      };
    }

    await registerGitHubOverviewEntities({
      repositories,
      pullRequests,
      issues,
      linkedRepositoryData,
    });

    return {
      account: resolvedAccount.summary,
      linkedRepository: {
        connected: Boolean(linkedRepositoryFullName),
        fullName: linkedRepositoryFullName,
      },
      linkedRepositories,
      repositories,
      pullRequests,
      issues,
      linkedRepositoryData,
      error: null,
    };
  } catch (error) {
    await handleGithubAccessFailure(resolvedAccount.userId, error);
    console.error("GITHUB_OVERVIEW_FETCH_ERROR", error);

    return {
      account: resolvedAccount.summary,
      linkedRepository: {
        connected: Boolean(linkedRepositoryFullName),
        fullName: linkedRepositoryFullName,
      },
      linkedRepositories,
      repositories: [],
      pullRequests: [],
      issues: [],
      linkedRepositoryData: null,
      error: error instanceof Error ? error.message : "Failed to load GitHub workspace data",
    };
  }
}
