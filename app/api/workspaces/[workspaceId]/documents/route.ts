import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createDocumentSchema } from "@/lib/validators/documents";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { Prisma } from "@/lib/generated/prisma/client";

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  try {
    const { workspaceId } = params;

    const { user } = await requireWorkspaceAccess(workspaceId);

    const body = await req.json();

    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const document = await prisma.document.create({
      data: {
        ...parsed.data,
        workspaceId,
        authorId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: document,
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

    console.error("Document POST error:", err);

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
    const { workspaceId } = params;

    await requireWorkspaceAccess(workspaceId);

    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error("Document GET error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch documents",
      },
      { status: 500 },
    );
  }
}
