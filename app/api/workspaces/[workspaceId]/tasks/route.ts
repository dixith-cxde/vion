import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validators/tasks";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  try {
    const { workspaceId } = await params;

    const { user } = await requireWorkspaceAccess(workspaceId);

    const body = await req.json();

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "No request body found",
        },
        { status: 400 },
      );
    }

    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const task = await prisma.task.create({
      data: {
        ...parsed.data,
        workspaceId,
        assigneeId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: task,
      },
      { status: 201 },
    );
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error("Task POST error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  try {
    const { workspaceId } = await params;

    await requireWorkspaceAccess(workspaceId);

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error("Task GET error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tasks",
      },
      { status: 500 },
    );
  }
}
