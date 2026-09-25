import type {
  ApiFailure,
  ApiSuccess,
  Invitation,
  MemberRole,
  WorkspaceData,
  WorkspaceMember,
} from "./settings-types";

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";

  let payload: ApiSuccess<T> | ApiFailure | null = null;

  if (contentType.includes("application/json")) {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload && "message" in payload && payload.message ? payload.message : "Request failed."
    );
  }

  if (payload && "data" in payload) {
    return payload.data;
  }

  return undefined as T;
}

export async function loadSettingsData(workspaceId: string) {
  const [workspace, members, invitations] = await Promise.all([
    fetchJson<WorkspaceData>(`/api/workspaces/${workspaceId}`),
    fetchJson<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),
    fetchJson<Invitation[]>(`/api/workspaces/${workspaceId}/invitations`),
  ]);

  return { workspace, members, invitations };
}

export function patchWorkspaceName(workspaceId: string, name: string) {
  return fetchJson<Pick<WorkspaceData, "id" | "name">>(`/api/workspaces/${workspaceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function postInvite(workspaceId: string, email: string, role: MemberRole) {
  return fetchJson<Invitation>(`/api/workspaces/${workspaceId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
}

export function deleteInvitation(invitationId: string) {
  return fetchJson(`/api/invitations/${invitationId}`, { method: "DELETE" });
}

export function patchMemberRole(workspaceId: string, memberId: string, role: MemberRole) {
  return fetchJson(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function deleteMember(workspaceId: string, memberId: string) {
  return fetchJson(`/api/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" });
}
