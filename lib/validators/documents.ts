import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1),
  contentJson: z.any().optional(),
  summary: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  parentId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
});

export const updateDocumentSchema = z.object({
  contentJson: z.any().optional(), // BlockNote JSON
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  authorName: z.string().min(1).optional(),
});
