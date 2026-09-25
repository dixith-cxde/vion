import { markGithubIntegrationNeedsReauth } from "@/lib/services/github-integration.service";
import type { GitHubDiscussionSummary } from "@/lib/types/github";
import { GITHUB_API_BASE_URL, GitHubDiscussionGraphQlResponse } from "../github.service";
export async function fetchGitHubJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "VION",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${message.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}
export async function fetchGitHubOptional<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function handleGithubAccessFailure(userId: string | null, error: unknown) {
  if (userId && error instanceof Error && error.message.includes("GitHub request failed (401)")) {
    await markGithubIntegrationNeedsReauth(
      userId,
      "GitHub access expired or was revoked. Reconnect GitHub to continue."
    );
  }
}

export async function fetchGitHubDiscussions(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubDiscussionSummary[]> {
  const response = await fetch(`${GITHUB_API_BASE_URL}/graphql`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "VION",
    },
    body: JSON.stringify({
      query: `
        query RepositoryDiscussions($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            discussions(first: 6, orderBy: { field: UPDATED_AT, direction: DESC }) {
              nodes {
                id
                number
                title
                url
                updatedAt
                answerChosenAt
              }
            }
          }
        }
      `,
      variables: {
        owner,
        name: repo,
      },
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GitHubDiscussionGraphQlResponse;

  if (payload.errors?.length) {
    return [];
  }

  return (payload.data?.repository?.discussions?.nodes ?? []).map((discussion) => ({
    id: discussion.id,
    number: discussion.number,
    title: discussion.title,
    url: discussion.url,
    updatedAt: discussion.updatedAt,
    answerChosen: Boolean(discussion.answerChosenAt),
  }));
}
