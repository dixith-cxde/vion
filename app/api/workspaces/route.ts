import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/services/user.service";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();

    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ message: "Workspace name is required" }, { status: 400 });
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const createdWorkspace = await tx.workspace.create({
        data: {
          name,
          ownerId: user.id,

          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      const generalChannel = await tx.channel.create({
        data: {
          name: "general",
          description: "General workspace discussion",
          type: "GROUP",
          visibility: "PUBLIC",
          workspaceId: createdWorkspace.id,
          createdById: user.id,
        },
      });

      const selfChannel = await tx.channel.create({
        data: {
          name: null,
          description: "Personal workspace channel",
          type: "SELF",
          visibility: "PRIVATE",
          workspaceId: createdWorkspace.id,
          createdById: user.id,
        },
      });

      await tx.channelMember.createMany({
        data: [
          {
            channelId: generalChannel.id,
            userId: user.id,
            role: "ADMIN",
          },

          {
            channelId: selfChannel.id,
            userId: user.id,
            role: "ADMIN",
          },
        ],
      });

      return createdWorkspace;
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("CREATE_WORKSPACE_ERROR", error);

    return NextResponse.json({ message: "Failed to create workspace" }, { status: 500 });
  }
}

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
    }))
  );
}
