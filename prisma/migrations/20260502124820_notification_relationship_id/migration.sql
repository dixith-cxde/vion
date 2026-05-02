/*
  Warnings:

  - A unique constraint covering the columns `[relationshipId]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "relationshipId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_relationshipId_key" ON "Notification"("relationshipId");
