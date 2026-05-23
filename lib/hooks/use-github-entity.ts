"use client";

import { useQuery } from "@tanstack/react-query";
import type { GitHubWorkspaceEntityDetail } from "@/lib/types/github";

async function fetchGithubEntityDetail(
  workspaceId: string,
  entityType: GitHubWorkspaceEntityDetail["entityType"],
  entityId: string,
): Promise<GitHubWorkspaceEntityDetail> {
  const response = await fetch(
    `/api/workspaces/${workspaceId}/github/entity?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? "Failed to load GitHub entity");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data: GitHubWorkspaceEntityDetail;
  };

  return payload.data;
}

export function useGithubEntity(
  workspaceId: string,
  entityType?: GitHubWorkspaceEntityDetail["entityType"] | null,
  entityId?: string | null,
) {
  return useQuery({
    queryKey: ["github-entity", workspaceId, entityType, entityId],
    queryFn: () => fetchGithubEntityDetail(workspaceId, entityType!, entityId!),
    enabled: Boolean(workspaceId && entityType && entityId),
  });
}
