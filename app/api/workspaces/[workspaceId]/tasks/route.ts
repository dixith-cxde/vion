import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validators/tasks";
import { NextResponse } from "next/server";
import { parse } from "zod/v4/core";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body)
      return NextResponse.json(
        {
          success: false,
          error: "No request body found",
        },
        { status: 400 },
      );

    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: parsed.error.issues },
        { status: 400 },
      );

    if (!parsed.data)
      return NextResponse.json(
        { success: false, error: "No data found" },
        { status: 400 },
      );

    const task = await prisma.task.create({
      data: {
        ...parsed.data,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: task,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        errorTrace: err,
      },
      { status: 500 },
    );
  }
}
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks", errorTrace: err },
      { status: 500 },
    );
  }
}
