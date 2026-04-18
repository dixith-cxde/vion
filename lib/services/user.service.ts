import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getOrCreateUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    user = await prisma.$transaction(async (tx) => {
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
          name: "Personal Workspace",
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

  return user;
}
