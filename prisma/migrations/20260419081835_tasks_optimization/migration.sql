/*
  Warnings:

  - The `status` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "TaskLifecycle" AS ENUM ('ACTIVE', 'PLANNED', 'UPCOMING', 'DRAFT', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "lifecycle" "TaskLifecycle" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "status",
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'TODO';
