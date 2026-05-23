-- CreateEnum
CREATE TYPE "GitHubConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "GitHubOAuthStateStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GitHubRepositorySyncStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISCONNECTED');

-- AlterTable
ALTER TABLE "GitHubAccount"
ADD COLUMN "accessTokenEncrypted" TEXT,
ADD COLUMN "authError" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "connectedAt" TIMESTAMP(3),
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "disconnectedAt" TIMESTAMP(3),
ADD COLUMN "email" TEXT,
ADD COLUMN "lastGithubEventAt" TIMESTAMP(3),
ADD COLUMN "lastSyncAt" TIMESTAMP(3),
ADD COLUMN "lastValidatedAt" TIMESTAMP(3),
ADD COLUMN "name" TEXT,
ADD COLUMN "needsReauth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "organizationSnapshot" JSONB,
ADD COLUMN "permissionSnapshot" JSONB,
ADD COLUMN "scopes" JSONB,
ADD COLUMN "status" "GitHubConnectionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "tokenType" TEXT DEFAULT 'bearer',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "accessToken" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GitHubOAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "returnTo" TEXT,
    "status" "GitHubOAuthStateStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubRepositoryConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "repositoryFullName" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "repositoryOwner" TEXT NOT NULL,
    "repositoryExternalId" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "installationTargetType" TEXT,
    "installationTargetId" TEXT,
    "defaultBranch" TEXT,
    "permissionsSnapshot" JSONB,
    "syncStatus" "GitHubRepositorySyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubRepositoryConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubOAuthState_state_key" ON "GitHubOAuthState"("state");

-- CreateIndex
CREATE INDEX "GitHubOAuthState_userId_idx" ON "GitHubOAuthState"("userId");

-- CreateIndex
CREATE INDEX "GitHubOAuthState_workspaceId_idx" ON "GitHubOAuthState"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepositoryConnection_workspaceId_repositoryFullName_key" ON "GitHubRepositoryConnection"("workspaceId", "repositoryFullName");

-- CreateIndex
CREATE INDEX "GitHubRepositoryConnection_workspaceId_idx" ON "GitHubRepositoryConnection"("workspaceId");

-- CreateIndex
CREATE INDEX "GitHubRepositoryConnection_workspaceId_isPrimary_idx" ON "GitHubRepositoryConnection"("workspaceId", "isPrimary");

-- AddForeignKey
ALTER TABLE "GitHubOAuthState" ADD CONSTRAINT "GitHubOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubOAuthState" ADD CONSTRAINT "GitHubOAuthState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepositoryConnection" ADD CONSTRAINT "GitHubRepositoryConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepositoryConnection" ADD CONSTRAINT "GitHubRepositoryConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
