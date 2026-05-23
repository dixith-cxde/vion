import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/services/notification.service";
import { requireWorkspaceAdmin } from "@/lib/services/permissions.service";
import { getCurrentDBUser } from "@/lib/services/user.service";

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

    // Permission guard
    await requireWorkspaceAdmin(workspaceId, userId);

    // Parse request
    const { email, role } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email required" },
        { status: 400 },
      );
    }

    // Prevent duplicate membership
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

    // Prevent duplicate invite
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

    // Create invitation
    const invite = await prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role,
        invitedById: userId,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    // Notification (only if user exists)
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

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
