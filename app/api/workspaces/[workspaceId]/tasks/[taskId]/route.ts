import { prisma } from "@/lib/prisma";
import { type Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { updateTaskSchema, taskParamsSchema } from "@/lib/validators/tasks";
import {
  notifyTaskAssignment,
  resolveWorkspaceAssignee,
} from "@/lib/services/task-assignment.service";

export async function GET(
  _req: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/tasks/[taskId]">,
) {
  try {
    const { workspaceId, taskId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error("Task GET error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
export async function PATCH(
  req: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/tasks/[taskId]">,
) {
  try {
    const { workspaceId, taskId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const parsedParams = taskParamsSchema.safeParse({ taskId });

    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsedBody = updateTaskSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId,
      },
      select: {
        id: true,
        title: true,
        assigneeId: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found in workspace" },
        { status: 404 },
      );
    }

    const { assigneeId: nextAssigneeId, ...restTaskFields } = parsedBody.data;
    const data: Prisma.TaskUpdateInput = { ...restTaskFields };

    if (nextAssigneeId !== undefined) {
      const { assigneeId } = await resolveWorkspaceAssignee(
        workspaceId,
        nextAssigneeId,
      );

      data.assignee = assigneeId
        ? {
            connect: {
              id: assigneeId,
            },
          }
        : {
            disconnect: true,
          };
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    await notifyTaskAssignment({
      assigneeId: updatedTask.assigneeId,
      previousAssigneeId: existingTask.assigneeId,
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      workspaceId,
      actorLabel: access.user.email,
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
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

    console.error("Task PATCH error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/tasks/[taskId]">,
) {
  try {
    const { workspaceId, taskId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const parsedParams = taskParamsSchema.safeParse({ taskId });

    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID" },
        { status: 400 },
      );
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found in workspace" },
        { status: 404 },
      );
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error("Task DELETE error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
