import { z } from 'zod';

const safePath = z
  .string()
  .min(1)
  .max(255)
  .trim()
  .refine((p) => !p.includes('..'), { message: 'Path traversal is not allowed' })
  .refine((p) => !p.startsWith('/') && !p.startsWith('\\'), {
    message: 'Absolute paths are not allowed',
  })
  // eslint-disable-next-line no-control-regex
  .refine((p) => !/[<>:"|?*\x00-\x1f]/.test(p), { message: 'Path contains invalid characters' });

export const fileSaveSchema = z.object({
  content: z.string().max(512_000),
});

export const filePatchSchema = z.object({
  patch: z.string().max(512_000),
  baseVersion: z.number().int().min(0),
});

export const fileCreateSchema = z.object({
  path: safePath,
  content: z.string().max(512_000).default(''),
  language: z.string().min(1).max(50),
});

export const fileUpdateSchema = z.object({
  path: safePath.optional(),
  language: z.string().min(1).max(50).optional(),
});

export type FileSaveInput = z.infer<typeof fileSaveSchema>;
export type FilePatchInput = z.infer<typeof filePatchSchema>;
export type FileCreateInput = z.infer<typeof fileCreateSchema>;
export type FileUpdateInput = z.infer<typeof fileUpdateSchema>;
