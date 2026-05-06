/*
  Warnings:

  - You are about to drop the column `type` on the `MessageAttachment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dmKey]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pinnedById` to the `PinnedMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dmKey" TEXT,
ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "content" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MessageAttachment" DROP COLUMN "type",
ADD COLUMN     "extension" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "size" INTEGER;

-- AlterTable
ALTER TABLE "PinnedMessage" ADD COLUMN     "pinnedById" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_dmKey_key" ON "Channel"("dmKey");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
