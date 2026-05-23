"use client";

import { useQuery } from "@tanstack/react-query";

import type { GitHubRepositoryDetail } from "@/lib/types/github";

type GitHubRepositoryDetailPayload = {
  mappingId: string;
  repository: GitHubRepositoryDetail;
};

async function fetchGithubRepositoryDetail(
  workspaceId: string,
  repositoryFullName: string,
): Promise<GitHubRepositoryDetailPayload> {
  const response = await fetch(
    `/api/workspaces/${workspaceId}/github/repositories/${repositoryFullName}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? "Failed to load repository details");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data: GitHubRepositoryDetailPayload;
  };

  return payload.data;
}

export function useGithubRepository(
  workspaceId: string,
  repositoryFullName: string,
) {
  return useQuery({
    queryKey: ["github-repository", workspaceId, repositoryFullName],
    queryFn: () => fetchGithubRepositoryDetail(workspaceId, repositoryFullName),
    enabled: Boolean(workspaceId && repositoryFullName),
  });
}
