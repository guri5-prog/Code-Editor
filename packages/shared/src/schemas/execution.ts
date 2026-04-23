import { z } from 'zod';

export const executeSchema = z.object({
  language: z.string().min(1).max(50),
  code: z.string().min(1).max(65_536),
  stdin: z.string().max(65_536).default(''),
  args: z.array(z.string().max(256)).max(20).default([]),
});

export type ExecuteInput = z.infer<typeof executeSchema>;
