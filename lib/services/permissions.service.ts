import { WorkspaceRole } from "@/lib/generated/prisma/client";
import { prisma } from "../prisma";

type WorkspacePermissionParams = {
  workspaceId: string;
  userId: string;
};

export async function getWorkspaceMembership({ workspaceId, userId }: WorkspacePermissionParams) {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
}

export async function requireWorkspaceMembership(params: WorkspacePermissionParams) {
  const member = await getWorkspaceMembership(params);

  if (!member) {
    throw new Error("NOT_MEMBER");
  }

  return member;
}

export async function requireWorkspaceAdmin(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!member) {
    throw new Error("NOT_MEMBER");
  }

  if (member.role !== WorkspaceRole.ADMIN && member.role !== WorkspaceRole.OWNER) {
    throw new Error("NOT_ALLOWED");
  }

  return member;
}

export async function requireWorkspaceOwner(params: WorkspacePermissionParams) {
  const member = await requireWorkspaceMembership(params);

  if (member.role !== WorkspaceRole.OWNER) {
    throw new Error("NOT_ALLOWED");
  }

  return member;
}

export function canManageWorkspaceContent(role: WorkspaceRole | string) {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

export function canEditDocumentEntity(params: {
  role: WorkspaceRole | string;
  userId: string;
  authorId: string | null;
}) {
  if (canManageWorkspaceContent(params.role)) {
    return true;
  }

  return Boolean(params.authorId && params.authorId === params.userId);
}

export function canEditTaskEntity(params: {
  role: WorkspaceRole | string;
  userId: string;
  createdById: string | null;
  assigneeId: string | null;
}) {
  if (canManageWorkspaceContent(params.role)) {
    return true;
  }

  return params.createdById === params.userId || params.assigneeId === params.userId;
}

export function canDeleteTaskEntity(params: {
  role: WorkspaceRole | string;
  userId: string;
  createdById: string | null;
}) {
  if (canManageWorkspaceContent(params.role)) {
    return true;
  }

  return Boolean(params.createdById && params.createdById === params.userId);
}
