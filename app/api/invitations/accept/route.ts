import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await getCurrentDBUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const userId = user.id;

    const { token, invitationId } = await req.json();

    if (!token && !invitationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invitation token or invitation id is required",
        },
        { status: 400 },
      );
    }

    const invite = invitationId
      ? await prisma.invitation.findUnique({
          where: { id: invitationId },
        })
      : await prisma.invitation.findUnique({
          where: { token },
        });

    if (!invite) {
      return NextResponse.json(
        { success: false, message: "Invalid invitation" },
        { status: 400 },
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "Invitation already used" },
        { status: 400 },
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: "Invitation expired" },
        { status: 400 },
      );
    }

    // email check
    const userEmail = user.email;

    if (!userEmail || userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "Email mismatch" },
        { status: 403 },
      );
    }

    // prevent duplicate membership
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, message: "Already a member" },
        { status: 400 },
      );
    }

    // transaction
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
          invitedById: invite.invitedById,
        },
      }),

      prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      }),

      prisma.relationship.create({
        data: {
          workspaceId: invite.workspaceId,
          sourceEntityType: "USER",
          sourceEntityId: userId,
          targetEntityType: "WORKSPACE",
          targetEntityId: invite.workspaceId,
          relationshipType: "MEMBER_OF",
        },
      }),
    ]);

    await createNotification({
      userId,
      type: "INVITE_RECEIVED",
      title: "Joined Workspace",
      message: "You have joined the workspace",
      workspaceId: invite.workspaceId,
    });

    return NextResponse.json({
      success: true,
      message: "Joined workspace successfully",
      data: {
        workspaceId: invite.workspaceId,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
