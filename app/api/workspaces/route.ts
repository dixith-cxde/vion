import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/services/user.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getOrCreateUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.workspaceMember.findMany({
    where: {
      userId: user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json(
    workspaces.map((wm) => ({
      id: wm.workspace.id,
      name: wm.workspace.name,
      role: wm.role,
      createdAt: wm.workspace.createdAt,
    })),
  );
}
