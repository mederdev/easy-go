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

  // Telegram bot (deep-link login/registration on both domains, booking
  // notifications). Both optional — without a token the bot poller doesn't
  // start and all Telegram sends are console-mocked, so every flow is
  // testable locally.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:8100'),

  // Internal endpoint — how the API itself reaches MinIO (e.g. minio:9000).
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_USE_SSL: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
  MINIO_ROOT_USER: z.string().default('easygo'),
  MINIO_ROOT_PASSWORD: z.string().default('easygo-secret'),
  MINIO_BUCKET: z.string().default('easygo'),
  MINIO_REGION: z.string().default('us-east-1'),

  // Public endpoint — the browser-reachable host used ONLY to sign presigned
  // URLs (e.g. storage.easygo-transfer.com:443). Falls back to the internal
  // endpoint when unset, so dev (single MinIO on localhost) is unchanged.
  MINIO_PUBLIC_ENDPOINT: z.string().optional(),
  MINIO_PUBLIC_PORT: z.coerce.number().int().optional(),
  MINIO_PUBLIC_USE_SSL: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  // Public presign endpoint defaults to the internal one when not configured.
  MINIO_PUBLIC_ENDPOINT: data.MINIO_PUBLIC_ENDPOINT ?? data.MINIO_ENDPOINT,
  MINIO_PUBLIC_PORT: data.MINIO_PUBLIC_PORT ?? data.MINIO_PORT,
  MINIO_PUBLIC_USE_SSL: data.MINIO_PUBLIC_USE_SSL ?? data.MINIO_USE_SSL,
};
export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
export const isProd = env.NODE_ENV === 'production';
