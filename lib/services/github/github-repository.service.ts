import type {
  GitHubRepositoryDetail,
  GitHubRepositoryListItem,
  GitHubWorkspaceRepositoryDirectory,
} from "@/lib/types/github";
import {
  GitHubBranchResponse,
  GitHubCommitResponse,
  GitHubIssueResponse,
  GitHubPullRequestResponse,
  GitHubReleaseResponse,
  GitHubRepositorySearchResponse,
  GitHubRestRepository,
  buildPaginationInfo,
  fetchGitHubDiscussions,
  fetchGitHubJson,
  fetchGitHubOptional,
  getConnectedWorkspaceRepositoryFullName,
  handleGithubAccessFailure,
  registerGitHubOverviewEntities,
  registerRepositorySummary,
  requireResolvedGithubAccess,
  splitRepositoryFullName,
  toCommitSummary,
  toIssueSummary,
  toPullRequestSummary,
  toRepositorySummary,
} from "../github.service";
export async function listGithubRepositories(params: {
  workspaceId: string;
  query?: string;
  page?: number;
  perPage?: number;
}): Promise<GitHubWorkspaceRepositoryDirectory> {
  const { workspaceId } = params;
  const query = params.query?.trim() ?? "";
  const page = Math.max(params.page ?? 1, 1);
  const perPage = Math.min(Math.max(params.perPage ?? 20, 1), 50);
  const resolvedAccount = await requireResolvedGithubAccess();
  const linkedRepositoryFullName = await getConnectedWorkspaceRepositoryFullName(workspaceId);

  try {
    const endpoint = query
      ? `/search/repositories?q=${encodeURIComponent(`${query} fork:true archived:false`)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`
      : `/user/repos?sort=updated&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`;

    const payload = query
      ? await fetchGitHubJson<GitHubRepositorySearchResponse>(endpoint, resolvedAccount.accessToken)
      : await fetchGitHubJson<GitHubRestRepository[]>(endpoint, resolvedAccount.accessToken);

    const repositories = Array.isArray(payload)
      ? payload.map(toRepositorySummary)
      : payload.items.map(toRepositorySummary);

    const items: GitHubRepositoryListItem[] = await Promise.all(
      repositories.map(async (repository) => ({
        ...repository,
        isConnected: repository.fullName === linkedRepositoryFullName,
        mappingId: await registerRepositorySummary(repository),
      }))
    );

    return {
      items,
      query,
      pageInfo: buildPaginationInfo({
        page,
        perPage,
        itemCount: repositories.length,
        totalCount: Array.isArray(payload) ? null : payload.total_count,
      }),
    };
  } catch (error) {
    await handleGithubAccessFailure(resolvedAccount.userId, error);
    throw error;
  }
}

export async function fetchRepositoryDetail(
  accessToken: string,
  repositoryFullName: string
): Promise<GitHubRepositoryDetail> {
  const { owner, repo } = splitRepositoryFullName(repositoryFullName);

  /*
   | REQUIRED REPOSITORY FETCH
   | This should still fail hard if the repository itself is inaccessible.
   */

  const repositoryResponse = await fetchGitHubJson<GitHubRestRepository>(
    `/repos/${owner}/${repo}`,
    accessToken
  );

  /*
   | OPTIONAL GITHUB FEATURES
   | These should never crash the entire repository runtime.
   */

  const [
    branchesResponse,
    releasesResponse,
    commitsResponse,
    pullRequestsResponse,
    issuesResponse,
    discussions,
  ] = await Promise.all([
    fetchGitHubOptional(
      fetchGitHubJson<GitHubBranchResponse[]>(
        `/repos/${owner}/${repo}/branches?per_page=12`,
        accessToken
      ),
      []
    ),

    fetchGitHubOptional(
      fetchGitHubJson<GitHubReleaseResponse[]>(
        `/repos/${owner}/${repo}/releases?per_page=10`,
        accessToken
      ),
      []
    ),

    fetchGitHubOptional(
      fetchGitHubJson<GitHubCommitResponse[]>(
        `/repos/${owner}/${repo}/commits?per_page=12`,
        accessToken
      ),
      []
    ),

    fetchGitHubOptional(
      fetchGitHubJson<GitHubPullRequestResponse[]>(
        `/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=10`,
        accessToken
      ),
      []
    ),

    fetchGitHubOptional(
      fetchGitHubJson<GitHubIssueResponse[]>(
        `/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc&per_page=10`,
        accessToken
      ),
      []
    ),

    fetchGitHubOptional(fetchGitHubDiscussions(accessToken, owner, repo), []),
  ]);

  const repository = toRepositorySummary(repositoryResponse);

  const branches = branchesResponse.map((branch) => ({
    name: branch.name,
    protected: branch.protected,
  }));

  const releases = releasesResponse.map((release, index) => ({
    id: release.id,
    name: release.name,
    tagName: release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at,
    isLatest: index === 0,
  }));

  const commits = commitsResponse.map((commit) => toCommitSummary(repository.fullName, commit));

  const pullRequests = pullRequestsResponse.map(toPullRequestSummary);

  const issues = issuesResponse.filter((issue) => !issue.pull_request).map(toIssueSummary);

  await registerGitHubOverviewEntities({
    repositories: [repository],
    pullRequests,
    issues,
    linkedRepositoryData: {
      repository,
      branches,
      releases,
      discussions,
      commits,
    },
  });

  return {
    repository,
    branches,
    releases,
    discussions,
    commits,
    pullRequests,
    issues,
  };
}

export async function getGithubRepositoryDetail(params: {
  workspaceId: string;
  repositoryFullName: string;
}) {
  const resolvedAccount = await requireResolvedGithubAccess();
  try {
    const repository = await fetchRepositoryDetail(
      resolvedAccount.accessToken,
      params.repositoryFullName
    );

    const mappingId = await registerRepositorySummary(repository.repository);

    return {
      mappingId,
      repository,
    };
  } catch (error) {
    await handleGithubAccessFailure(resolvedAccount.userId, error);
    throw error;
  }
}
