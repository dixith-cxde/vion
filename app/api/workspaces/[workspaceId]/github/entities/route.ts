import { NextResponse } from "next/server";
import { z } from "zod";

import { upsertGitHubEntityReference } from "@/lib/entities/mention";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const githubEntitySchema = z.object({
  type: z.enum([
    "GITHUB_REPOSITORY",
    "GITHUB_PULL_REQUEST",
    "GITHUB_ISSUE",
    "GITHUB_DISCUSSION",
    "GITHUB_RELEASE",
    "GITHUB_BRANCH",
  ]),
  externalId: z.string().min(1).max(255),
  title: z.string().max(255).nullish(),
  repositoryFullName: z.string().max(255).nullish(),
  subtitle: z.string().max(255).nullish(),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/workspaces/[workspaceId]/github/entities">,
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

    const parsed = githubEntitySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const entity = await upsertGitHubEntityReference(parsed.data);

    return NextResponse.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    console.error("GITHUB_ENTITY_UPSERT_ERROR", error);
    return NextResponse.json(
      { success: false, error: "Failed to register GitHub entity" },
      { status: 500 },
    );
  }
}
