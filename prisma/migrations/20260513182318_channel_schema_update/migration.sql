/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,slug]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'ENTITY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CHANNEL_INVITED';
ALTER TYPE "NotificationType" ADD VALUE 'CHANNEL_ADDED';
ALTER TYPE "NotificationType" ADD VALUE 'ENTITY_MENTION';

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "ChannelMember" ADD COLUMN     "lastReadMessageId" TEXT,
ADD COLUMN     "mutedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MessageMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageMention_messageId_userId_key" ON "MessageMention"("messageId", "userId");

-- CreateIndex
CREATE INDEX "Channel_workspaceId_type_idx" ON "Channel"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Channel_workspaceId_visibility_idx" ON "Channel"("workspaceId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_workspaceId_slug_key" ON "Channel"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "ChannelMember_channelId_idx" ON "ChannelMember"("channelId");

-- CreateIndex
CREATE INDEX "ChannelMember_userId_idx" ON "ChannelMember"("userId");

-- CreateIndex
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");

-- AddForeignKey
ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
