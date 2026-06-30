import { Client as MinioClient } from 'minio';
import { env } from '../env.js';

// Internal client — used for the API's own S3 operations (ensureBucket, etc.).
// In production it talks to MinIO directly inside the Docker network
// (minio:9000, no TLS): fast and free of any public-DNS/TLS dependency.
export const minio = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
  region: env.MINIO_REGION,
});

// Public client — used ONLY to generate presigned URLs handed to the browser.
// Configured with the public, browser-reachable host so the SigV4 host in the
// signature matches what the client actually connects to (the edge proxies it
// to minio:9000 preserving the Host header). Presigning is offline (no network
// call) because the region is set explicitly.
const minioPublic = new MinioClient({
  endPoint: env.MINIO_PUBLIC_ENDPOINT,
  port: env.MINIO_PUBLIC_PORT,
  useSSL: env.MINIO_PUBLIC_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
  region: env.MINIO_REGION,
});

export const BUCKET = env.MINIO_BUCKET;

/** Ensure the app bucket exists (createbuckets compose job also does this). */
export async function ensureBucket(): Promise<void> {
  const exists = await minio.bucketExists(BUCKET).catch(() => false);
  if (!exists) await minio.makeBucket(BUCKET);
}

export function presignedPut(key: string, expirySeconds = 600): Promise<string> {
  return minioPublic.presignedPutObject(BUCKET, key, expirySeconds);
}

export function presignedGet(key: string, expirySeconds = 3600): Promise<string> {
  return minioPublic.presignedGetObject(BUCKET, key, expirySeconds);
}
