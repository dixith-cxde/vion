import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateDocumentSchema } from "@/lib/validators/documents";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ✅ FIX: unwrap params
    const resolvedParams = await params;

    // 1. Validate params
    const parsedParams = paramsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: "Invalid document ID" },
        { status: 400 },
      );
    }

    // 2. Validate body
    const body = await req.json();
    const parsedBody = updateDocumentSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsedBody.error.errors[0].message,
        },
        { status: 400 },
      );
    }

    // 3. Update document
    const document = await prisma.document.update({
      where: { id: parsedParams.data.id },
      data: {
        contentJson: parsedBody.data.contentJson,
      },
    });

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (err: any) {
    console.error("Document PATCH error:", err);

    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
