import { NextResponse } from "next/server";
import { z } from "zod";
import { startGithubIntegration } from "@/lib/services/github-integration.service";
import { getCurrentDBUser } from "@/lib/services/user.service";

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  returnTo: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentDBUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      returnTo: searchParams.get("returnTo") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, { status: 400 });
    }

    const oauth = await startGithubIntegration({
      userId: currentUser.id,
      workspaceId: parsed.data.workspaceId,
      returnTo: parsed.data.returnTo,
    });

    return NextResponse.redirect(oauth.url);
  } catch (error) {
    console.error("GITHUB_CONNECT_REDIRECT_ERROR", error);
    return NextResponse.json({ error: "Failed to begin GitHub OAuth flow" }, { status: 500 });
  }
}
