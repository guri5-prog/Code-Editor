import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/code-editor'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_OPTIONAL: z.coerce.boolean().default(false),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SERVER_URL: z.string().url().default('http://localhost:3001'),
});

const rawEnv: Record<string, string | undefined> = { ...process.env };
const isTestRuntime = rawEnv.NODE_ENV === 'test';
if (!rawEnv.JWT_SECRET && isTestRuntime) {
  rawEnv.JWT_SECRET = 'test-jwt-secret-minimum-32-characters';
}

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
