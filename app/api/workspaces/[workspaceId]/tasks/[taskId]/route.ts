import { prisma } from "@/lib/prisma";
import { type Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { updateTaskSchema, taskParamsSchema } from "@/lib/validators/tasks";

export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string; taskId: string } },
) {
  try {
    const { workspaceId, taskId } = params;

    await requireWorkspaceAccess(workspaceId);

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
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found in workspace" },
        { status: 404 },
      );
    }

    const data: Prisma.TaskUpdateInput = { ...parsedBody.data };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
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
  req: Request,
  { params }: { params: { workspaceId: string; taskId: string } },
) {
  try {
    const { workspaceId, taskId } = params;

    await requireWorkspaceAccess(workspaceId);

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
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
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
