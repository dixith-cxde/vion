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
] as const;

export const createRelationshipSchema = z.object({
  sourceEntityType: z.enum([
    "TASK",
    "DOCUMENT",
    "MESSAGE",
    "COMMIT",
    "CHANNEL",
  ]),

  sourceEntityId: z.string().uuid(),

  targetEntityType: z.enum([
    "TASK",
    "DOCUMENT",
    "MESSAGE",
    "COMMIT",
    "CHANNEL",
  ]),

  targetEntityId: z.string().uuid(),

  relationshipType: z.enum(relationshipTypeEnum),
});
