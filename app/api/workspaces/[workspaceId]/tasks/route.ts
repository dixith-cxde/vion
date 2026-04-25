import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validators/tasks";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  notifyTaskAssignment,
  resolveWorkspaceAssignee,
} from "@/lib/services/task-assignment.service";

function serializeTask(task: {
  assigneeId: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  } | null;
} & Record<string, unknown>) {
  return {
    ...task,
    assignedToId: task.assigneeId,
    assignedTo: task.assignee ?? null,
  };
}

export async function POST(
  req: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/tasks">,
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        {
          success: false,
          error: access.error,
        },
        { status: access.status },
      );
    }

    const { user } = access;

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

    const requestedAssignedToId =
      parsed.data.assignedToId ?? parsed.data.assigneeId;

    const { assigneeId } = await resolveWorkspaceAssignee(
      workspaceId,
      requestedAssignedToId,
    );

    const {
      assignedToId: _assignedToId,
      assigneeId: _assigneeId,
      ...taskFields
    } = parsed.data;

    const task = await prisma.task.create({
      data: {
        ...taskFields,
        workspaceId,
        assigneeId: assigneeId ?? null,
        createdById: user.id,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    await notifyTaskAssignment({
      assignedToId: task.assigneeId,
      taskId: task.id,
      taskTitle: task.title,
      workspaceId,
      actorLabel: user.email,
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeTask(task),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_ASSIGNEE") {
      return NextResponse.json(
        {
          success: false,
          error: "Assignee must be a member of the workspace",
        },
        { status: 400 },
      );
    }

    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
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
  _req: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/tasks">,
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        {
          success: false,
          error: access.error,
        },
        { status: access.status },
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: tasks.map(serializeTask),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
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
