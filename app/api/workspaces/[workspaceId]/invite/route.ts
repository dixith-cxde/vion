import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { WorkspaceRole } from "@/lib/generated/prisma/enums";
import { createNotification } from "@/lib/services/notification.service";
import { requireWorkspaceAdmin } from "@/lib/services/permissions.service";
import { getCurrentDBUser } from "@/lib/services/user.service";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    const user = await getCurrentDBUser();

    if (!workspaceId || !user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const userId = user.id;

    await requireWorkspaceAdmin(workspaceId, userId);

    const parsed = inviteSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.message },
        { status: 400 },
      );
    }

    const { email, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (alreadyMember) {
        return NextResponse.json(
          { success: false, message: "User already in workspace" },
          { status: 400 },
        );
      }
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: {
        workspaceId,
        email,
        status: "PENDING",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { success: false, message: "Already invited" },
        { status: 400 },
      );
    }

    const invite = await prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role,
        invitedById: userId,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (existingUser) {
      await createNotification({
        userId: existingUser.id,
        senderId: userId,
        type: "INVITE_RECEIVED",
        title: "Workspace Invitation",
        message: `You have been invited to join this workspace as ${role}.`,
        workspaceId,
        entityId: invite.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: invite,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    if (message === "NOT_MEMBER" || message === "NOT_ALLOWED") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
