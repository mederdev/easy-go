import { Client as MinioClient } from 'minio';
import { env } from '../env.js';

export const minio = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
});

export const BUCKET = env.MINIO_BUCKET;

/** Ensure the app bucket exists (createbuckets compose job also does this). */
export async function ensureBucket(): Promise<void> {
  const exists = await minio.bucketExists(BUCKET).catch(() => false);
  if (!exists) await minio.makeBucket(BUCKET);
}

export function presignedPut(key: string, expirySeconds = 600): Promise<string> {
  return minio.presignedPutObject(BUCKET, key, expirySeconds);
}

export function presignedGet(key: string, expirySeconds = 3600): Promise<string> {
  return minio.presignedGetObject(BUCKET, key, expirySeconds);
}
