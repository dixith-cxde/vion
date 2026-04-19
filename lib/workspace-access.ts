import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/services/user.service";

type AccessSuccess = {
  user: {
    id: string;
    email: string;
  };
  membership: {
    id: string;
    workspaceId: string;
    userId: string;
    role: string;
  };
};

type AccessError = {
  error: "UNAUTHORIZED" | "FORBIDDEN" | "FORBIDDEN_ROLE";
  status: number;
};

export async function requireWorkspaceAccess(
  workspaceId: string,
  allowedRoles?: string[],
): Promise<AccessSuccess | AccessError> {
  const user = await getOrCreateUser();

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
    },
    membership: {
      id: membership.id,
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
    },
  };
}
