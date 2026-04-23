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
  .refine((p) => !/[<>:"|?*]/.test(p), { message: 'Path contains invalid characters' })
  .refine((p) => [...p].every((ch) => ch.charCodeAt(0) >= 0x20), {
    message: 'Path contains invalid characters',
  });

export const templateFileSchema = z.object({
  path: safePath,
  language: z.string().min(1).max(50),
  content: z.string().max(512_000),
});

export const templateCreateSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().min(1).max(500).trim(),
  language: z.string().min(1).max(50).trim(),
  tags: z.array(z.string().min(1).max(40).trim()).max(12).default([]),
  files: z.array(templateFileSchema).min(1).max(30),
});

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
