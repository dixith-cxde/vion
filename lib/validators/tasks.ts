import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  lifecycle: z
    .enum(["ACTIVE", "PLANNED", "UPCOMING", "DRAFT", "ARCHIVED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedAt: z.number().int().positive().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  lifecycle: z
    .enum(["ACTIVE", "PLANNED", "UPCOMING", "DRAFT", "ARCHIVED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedAt: z.number().int().positive().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const taskParamsSchema = z.object({
  taskId: z.string().uuid(),
});
