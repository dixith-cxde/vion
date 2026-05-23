import { z } from "zod";

export const relationshipTypeEnum = [
  // DOCUMENT
  "EXPLAINS",
  "REFERENCES",

  // TASK FLOW
  "BLOCKS",
  "DEPENDS_ON",
  "RELATED_TO",

  // EXECUTION
  "RESOLVES",
  "IMPLEMENTS",

  // CONVERSION
  "CONVERTED_TO",

  // OWNERSHIP / STRUCTURE
  "BELONGS_TO",
  "PART_OF",

  // GITHUB SPECIFIC
  "PR_FOR",
  "COMMIT_FOR",
  "ISSUE_FOR",
  "MENTIONS",
] as const;

const entityTypeEnum = [
  "WORKSPACE",
  "TASK",
  "DOCUMENT",
  "MESSAGE",
  "COMMIT",
  "CHANNEL",
  "USER",
  "GITHUB_REPOSITORY",
  "GITHUB_PULL_REQUEST",
  "GITHUB_ISSUE",
  "GITHUB_DISCUSSION",
  "GITHUB_RELEASE",
  "GITHUB_BRANCH",
] as const;

export const createRelationshipSchema = z.object({
  sourceEntityType: z.enum(entityTypeEnum),

  sourceEntityId: z.string().min(1),

  targetEntityType: z.enum(entityTypeEnum),

  targetEntityId: z.string().min(1),

  relationshipType: z.enum(relationshipTypeEnum),
});
