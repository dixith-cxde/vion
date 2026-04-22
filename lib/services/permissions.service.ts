import { prisma } from "../prisma";

export async function requireWorkspaceAdmin(
  workspaceId: string,
  userId: string,
) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!member) {
    throw new Error("NOT_MEMBER");
  }
  console.log({member});

  if (member.role !== "ADMIN" && member.role !== "OWNER") {
    throw new Error("NOT_ALLOWED");
  }

  return member;
}
