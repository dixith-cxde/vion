import { prisma } from "@/lib/prisma";
import { getCurrentDBUser } from "@/lib/services/user.service";
import type { WorkspaceRole } from "@/lib/generated/prisma/client";

type AccessSuccess = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  membership: {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
  };
};

type AccessError = {
  error: "UNAUTHORIZED" | "FORBIDDEN" | "FORBIDDEN_ROLE" | "INVALID_ID";
  status: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireWorkspaceAccess(
  workspaceId: string,
  allowedRoles?: WorkspaceRole[],
): Promise<AccessSuccess | AccessError> {
  if (!UUID_RE.test(workspaceId)) {
    return {
      error: "INVALID_ID",
      status: 400,
    };
  }

  const user = await getCurrentDBUser();

  if (!user) {
    return {
      error: "UNAUTHORIZED",
      status: 401,
    };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId: user.id,
        workspaceId: workspaceId,
      },
    },
  });

  if (!membership) {
    return {
      error: "FORBIDDEN",
      status: 403,
    };
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    return {
      error: "FORBIDDEN_ROLE",
      status: 403,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    membership: {
      id: membership.id,
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
    },
  };
}
