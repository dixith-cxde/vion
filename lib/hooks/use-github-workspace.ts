"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GitHubWorkspaceOverview } from "@/lib/types/github";

async function fetchGithubWorkspace(
  workspaceId: string,
): Promise<GitHubWorkspaceOverview> {
  const response = await fetch(`/api/workspaces/${workspaceId}/github`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load GitHub workspace");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data: GitHubWorkspaceOverview;
  };

  return payload.data;
}

export function useGithubWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["github-workspace", workspaceId],
    queryFn: () => fetchGithubWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const connectRepository = useMutation({
    mutationFn: async (repositoryFullName: string) => {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/github/repository`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ repositoryFullName }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to connect repository");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["github-workspace", workspaceId],
      });
    },
  });

  const disconnectRepository = useMutation({
    mutationFn: async (repositoryFullName?: string) => {
      const search = repositoryFullName
        ? `?repositoryFullName=${encodeURIComponent(repositoryFullName)}`
        : "";
      const response = await fetch(
        `/api/workspaces/${workspaceId}/github/repository${search}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to disconnect repository");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["github-workspace", workspaceId],
      });
    },
  });

  const disconnectGithubAccount = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/github/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect GitHub");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["github-workspace", workspaceId],
      });
    },
  });

  return {
    ...query,
    connectRepository: connectRepository.mutateAsync,
    isConnectingRepository: connectRepository.isPending,
    disconnectRepository: disconnectRepository.mutateAsync,
    isDisconnectingRepository: disconnectRepository.isPending,
    disconnectGithubAccount: disconnectGithubAccount.mutateAsync,
    isDisconnectingGithubAccount: disconnectGithubAccount.isPending,
  };
}
