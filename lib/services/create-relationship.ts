import { prisma } from "@/lib/prisma";

type EntityType =
  | "WORKSPACE"
  | "TASK"
  | "DOCUMENT"
  | "MESSAGE"
  | "COMMIT"
  | "CHANNEL"
  | "USER"
  | "GITHUB_REPOSITORY"
  | "GITHUB_PULL_REQUEST"
  | "GITHUB_ISSUE"
  | "GITHUB_DISCUSSION"
  | "GITHUB_RELEASE"
  | "GITHUB_BRANCH";

type CreateRelationshipInput = {
  workspaceId: string;
  sourceEntityType: EntityType;
  sourceEntityId: string;
  targetEntityType: EntityType;
  targetEntityId: string;
  relationshipType: string;
};

async function validateEntity(
  entityType: EntityType,
  entityId: string,
  workspaceId: string,
) {
  switch (entityType) {
    case "WORKSPACE":
      return prisma.workspace.findFirst({
        where: { id: entityId },
      });

    case "TASK":
      return prisma.task.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "DOCUMENT":
      return prisma.document.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "MESSAGE":
      return prisma.message.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "COMMIT":
      return prisma.commit.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "CHANNEL":
      return prisma.channel.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "USER":
      return prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: entityId },
      });

    case "GITHUB_REPOSITORY":
    case "GITHUB_PULL_REQUEST":
    case "GITHUB_ISSUE":
    case "GITHUB_DISCUSSION":
    case "GITHUB_RELEASE":
    case "GITHUB_BRANCH":
      return prisma.externalMapping.findFirst({
        where: {
          id: entityId,
          entityType,
        },
      });

    default:
      return null;
  }
}

export async function createRelationship(data: CreateRelationshipInput) {
  const {
    workspaceId,
    sourceEntityType,
    sourceEntityId,
    targetEntityType,
    targetEntityId,
    relationshipType,
  } = data;

  const existingRelationship = await prisma.relationship.findFirst({
    where: {
      workspaceId,
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      relationshipType,
    },
  });

  if (existingRelationship) {
    return existingRelationship;
  }

  const source = await validateEntity(
    sourceEntityType,
    sourceEntityId,
    workspaceId,
  );

  if (!source) {
    throw new Error("Invalid source entity for workspace");
  }

  const target = await validateEntity(
    targetEntityType,
    targetEntityId,
    workspaceId,
  );

  if (!target) {
    throw new Error("Invalid target entity for workspace");
  }

  return prisma.relationship.create({
    data: {
      workspaceId,
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      relationshipType,
    },
  });
}
