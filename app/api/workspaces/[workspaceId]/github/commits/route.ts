import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { ingestGitHubCommit, listWorkspaceCommits } from "@/lib/services/github.service";
import { emitChannelMessage, emitChannelUpdated } from "@/lib/socket/chat.events";
import { getChannelSummaryForUser } from "@/lib/services/channel.service";

const commitLinkSchema = z.object({
  entityType: z.enum(["TASK", "DOCUMENT", "MESSAGE", "CHANNEL"]),
  entityId: z.string().uuid(),
  relationshipType: z.string().optional(),
});

const ingestCommitSchema = z.object({
  commitSha: z.string().min(1),
  message: z.string().min(1),
  authorGithubId: z.string().optional(),
  authorUsername: z.string().optional(),
  repositoryFullName: z.string().optional(),
  channelId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  links: z.array(commitLinkSchema).default([]),
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

    const commits = await listWorkspaceCommits(workspaceId);

    return NextResponse.json({
      success: true,
      data: commits,
    });
  } catch (error) {
    console.error("ERROR_FETCHING_GITHUB_COMMITS", error);
    return NextResponse.json({ error: "Failed to fetch GitHub commits" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { workspaceId } = await params;
    const access = await requireWorkspaceAccess(workspaceId);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const parsed = ingestCommitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { metadata, ...rest } = parsed.data;

    const result = await ingestGitHubCommit({
      workspaceId,
      authorUserId: access.user.id,
      ...rest,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    });

    if (result.activityMessage) {
      emitChannelMessage({
        workspaceId,
        channelId: result.activityMessage.channelId,
        message: result.activityMessage,
      });

      const channel = await getChannelSummaryForUser({
        channelId: result.activityMessage.channelId,
        userId: access.user.id,
      });

      if (channel) {
        emitChannelUpdated({
          workspaceId,
          channel,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("ERROR_INGESTING_GITHUB_COMMIT", error);
    return NextResponse.json({ error: "Failed to ingest GitHub commit" }, { status: 500 });
  }
}
