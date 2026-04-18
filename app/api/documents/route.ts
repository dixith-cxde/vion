import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createDocumentSchema } from "@/lib/validators/documents";

export async function POST(req: Request) {
  try {
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
      data: parsed.data,
    });

    // 3. Response
    return NextResponse.json(
      {
        success: true,
        data: document,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Document POST error:", err);

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
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (err) {
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
