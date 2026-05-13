import { useQuery } from "@tanstack/react-query";

type WorkspaceMember = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    imageUrl: string | null;
  };
};

type WorkspaceMembersResponse = {
  success: boolean;

  data: WorkspaceMember[];
};

async function fetchWorkspaceMembers(
  workspaceId: string,
  signal?: AbortSignal
): Promise<WorkspaceMember[]> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: "GET",

    credentials: "include",

    signal,

    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch workspace members");
  }

  const result: WorkspaceMembersResponse = await response.json();

  return result.data;
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],

    queryFn: ({ signal }) => fetchWorkspaceMembers(workspaceId, signal),

    enabled: Boolean(workspaceId),

    staleTime: 1000 * 60,

    gcTime: 1000 * 60 * 5,

    retry: 2,

    refetchOnWindowFocus: false,
  });
}
