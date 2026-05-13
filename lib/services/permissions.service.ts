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
