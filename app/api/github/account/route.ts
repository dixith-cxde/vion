import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDBUser } from "@/lib/services/user.service";
import {
  disconnectGithubIntegration,
  getGithubIntegrationAccount,
  startGithubIntegration,
} from "@/lib/services/github-integration.service";

const beginGithubOauthSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  returnTo: z.string().optional(),
});

export async function GET() {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getGithubIntegrationAccount(currentUser.id);

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("ERROR_FETCHING_GITHUB_ACCOUNT", error);
    return NextResponse.json({ error: "Failed to load GitHub account" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = beginGithubOauthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const oauth = await startGithubIntegration({
      userId: currentUser.id,
      workspaceId: parsed.data.workspaceId,
      returnTo: parsed.data.returnTo,
    });

    return NextResponse.json({
      success: true,
      data: oauth,
    });
  } catch (error) {
    console.error("ERROR_STARTING_GITHUB_ACCOUNT_CONNECT", error);
    return NextResponse.json({ error: "Failed to start GitHub connect flow" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnectGithubIntegration(currentUser.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("ERROR_UNLINKING_GITHUB_ACCOUNT", error);
    return NextResponse.json({ error: "Failed to unlink GitHub account" }, { status: 500 });
  }
}
