import { NextResponse } from "next/server";
import { createRelationship } from "@/lib/services/create-relationship";
import { createRelationshipSchema } from "@/lib/validators/relationship";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  try {
    const { workspaceId } = params;

    await requireWorkspaceAccess(workspaceId);

    const body = await req.json();

    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const relationship = await createRelationship({
      ...parsed.data,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      data: relationship,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error(err);

    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 },
    );
  }
}
