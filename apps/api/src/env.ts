import { config } from 'dotenv';
import { z } from 'zod';

// Load repo-root .env first, then a package-local override if present.
config({ path: ['../../.env', '.env'] });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:8100'),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_USE_SSL: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
  MINIO_ROOT_USER: z.string().default('easygo'),
  MINIO_ROOT_PASSWORD: z.string().default('easygo-secret'),
  MINIO_BUCKET: z.string().default('easygo'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
export const isProd = env.NODE_ENV === 'production';
