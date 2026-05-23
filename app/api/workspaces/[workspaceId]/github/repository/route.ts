import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  connectWorkspaceGithubRepository,
  disconnectWorkspaceGithubRepository,
  getWorkspaceGithubRepository,
} from "@/lib/services/github.service";

const repositorySchema = z.object({
  repositoryFullName: z.string().min(1),
});

type Params = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspaceId } = await params;
    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const repository = await getWorkspaceGithubRepository(workspaceId);

    return NextResponse.json({
      success: true,
      data: repository,
    });
  } catch (error) {
    console.error("ERROR_FETCHING_WORKSPACE_REPOSITORY", error);
    return NextResponse.json({ error: "Failed to load repository integration" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { workspaceId } = await params;
    const access = await requireWorkspaceAccess(workspaceId, ["OWNER", "ADMIN"]);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const parsed = repositorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const repository = await connectWorkspaceGithubRepository({
      workspaceId,
      repositoryFullName: parsed.data.repositoryFullName,
      actorId: access.user.id,
    });

    return NextResponse.json({
      success: true,
      data: repository,
    });
  } catch (error) {
    console.error("ERROR_CONNECTING_WORKSPACE_REPOSITORY", error);
    return NextResponse.json({ error: "Failed to connect GitHub repository" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { workspaceId } = await params;
    const access = await requireWorkspaceAccess(workspaceId, ["OWNER", "ADMIN"]);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const result = await disconnectWorkspaceGithubRepository({
      workspaceId,
      repositoryFullName: searchParams.get("repositoryFullName"),
      actorId: access.user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("ERROR_DISCONNECTING_WORKSPACE_REPOSITORY", error);
    return NextResponse.json({ error: "Failed to disconnect GitHub repository" }, { status: 500 });
  }
}
