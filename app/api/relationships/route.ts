import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createRelationshipSchema } from "@/lib/validators/relationship";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const relationship = await prisma.relationship.create({
      data: parsed.data,
    });

    return NextResponse.json(
      {
        success: true,
        data: relationship,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Relationship POST error:", err);

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
