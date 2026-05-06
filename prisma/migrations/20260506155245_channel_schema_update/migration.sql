/*
  Warnings:

  - The values [PUBLIC,PRIVATE] on the enum `ChannelType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `visibility` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChannelVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterEnum
BEGIN;
CREATE TYPE "ChannelType_new" AS ENUM ('DM', 'GROUP', 'SELF', 'SYSTEM');
ALTER TABLE "Channel" ALTER COLUMN "type" TYPE "ChannelType_new" USING ("type"::text::"ChannelType_new");
ALTER TYPE "ChannelType" RENAME TO "ChannelType_old";
ALTER TYPE "ChannelType_new" RENAME TO "ChannelType";
DROP TYPE "public"."ChannelType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "visibility" "ChannelVisibility" NOT NULL;
