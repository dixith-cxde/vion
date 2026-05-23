import { NextResponse } from "next/server";
import { z } from "zod";

import { listGithubRepositories } from "@/lib/services/github.service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const querySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  perPage: z.coerce.number().min(1).max(50).optional(),
});

export async function GET(
  request: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/github/repositories">,
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

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      perPage: searchParams.get("perPage") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
        { status: 400 },
      );
    }

    const directory = await listGithubRepositories({
      workspaceId,
      query: parsed.data.q,
      page: parsed.data.page,
      perPage: parsed.data.perPage,
    });

    return NextResponse.json({
      success: true,
      data: directory,
    });
  } catch (error) {
    console.error("GITHUB_REPOSITORY_DIRECTORY_ERROR", error);
    return NextResponse.json(
      { success: false, error: "Failed to load GitHub repositories" },
      { status: 500 },
    );
  }
}
