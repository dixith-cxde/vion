import { NextResponse } from "next/server";
import { createRelationship } from "@/lib/services/create-relationship";
import { createRelationshipSchema } from "@/lib/validators/relationship";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ validate
    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    // ✅ execute
    const relationship = await createRelationship(parsed.data);

    return NextResponse.json({
      success: true,
      data: relationship,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 },
    );
  }
}
