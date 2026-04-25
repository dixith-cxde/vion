import { NextResponse } from "next/server";
import { createRelationship } from "@/lib/services/create-relationship";
import { createRelationshipSchema } from "@/lib/validators/relationship";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const body = await req.json();

    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
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
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create relationship",
      },
      { status: 500 },
    );
  }
}
