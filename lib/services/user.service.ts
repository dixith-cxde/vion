import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createWorkspace } from "@/lib/services/workspace.service";

export async function getOrCreateUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: clerkUser.id,
    },
  });

  if (!user) {
    return prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          clerkId: clerkUser.id,

          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",

          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",

          imageUrl: clerkUser.imageUrl,

          username: clerkUser.username || clerkUser.firstName || "user",
        },
      });

      await createWorkspace({
        tx,

        name: `${newUser.name}'s Workspace`,

        ownerId: newUser.id,
      });

      return newUser;
    });
  }

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!existingMembership) {
    await prisma.$transaction(async (tx) => {
      await createWorkspace({
        tx,

        name: `${user.name}'s Workspace`,

        ownerId: user.id,
      });
    });
  }

  return user;
}

export async function getCurrentDBUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      clerkId: clerkUser.id,
    },
  });
}
