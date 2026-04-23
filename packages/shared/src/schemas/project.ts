import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(400).optional().or(z.literal('')),
  language: z.string().trim().min(1).max(50),
  isPublic: z.boolean().optional().default(false),
  templateId: z.string().trim().max(100).optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(400).optional().or(z.literal('')),
  language: z.string().trim().min(1).max(50).optional(),
  isPublic: z.boolean().optional(),
});

export const collaboratorSchema = z.object({
  userId: z.string().trim().min(1),
  permission: z.enum(['edit', 'view', 'execute']),
});

export const collaboratorPermissionSchema = z.object({
  permission: z.enum(['edit', 'view', 'execute']),
});

export const projectListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type CollaboratorInput = z.infer<typeof collaboratorSchema>;
export type CollaboratorPermissionInput = z.infer<typeof collaboratorPermissionSchema>;
export type ProjectListQueryInput = z.infer<typeof projectListQuerySchema>;
