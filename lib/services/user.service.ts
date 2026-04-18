import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getOrCreateUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  // CASE 1: USER DOES NOT EXIST
  if (!user) {
    return await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name:
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            "User",
          imageUrl: clerkUser.imageUrl,
          username: clerkUser.username || clerkUser.firstName || "user",
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${newUser.name}'s Workspace`,
          ownerId: newUser.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: newUser.id,
          role: "OWNER",
        },
      });

      return newUser;
    });
  }

  // CASE 2: USER EXISTS BUT NO WORKSPACE MEMBER
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
  });

  if (!existingMembership) {
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: `${user.name}'s Workspace`,
          ownerId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    });
  }

  return user;
}
