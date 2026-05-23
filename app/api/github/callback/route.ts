import { NextResponse } from "next/server";
import { z } from "zod";
import { completeGithubIntegration } from "@/lib/services/github-integration.service";

const querySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function getErrorRedirect(message: string) {
  const redirect = new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  redirect.searchParams.set("github_error", message);
  return redirect;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      code: searchParams.get("code") ?? undefined,
      state: searchParams.get("state") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.redirect(getErrorRedirect("Invalid GitHub callback payload"));
    }

    const result = await completeGithubIntegration(parsed.data);
    const pathname =
      result.returnTo ||
      (result.workspaceId ? `/workspaces/${result.workspaceId}/github` : "/dashboard");

    return NextResponse.redirect(new URL(pathname, request.url));
  } catch (error) {
    console.error("GITHUB_CALLBACK_ERROR", error);
    return NextResponse.redirect(
      getErrorRedirect(
        error instanceof Error ? error.message : "Failed to complete GitHub integration",
      ),
    );
  }
}
