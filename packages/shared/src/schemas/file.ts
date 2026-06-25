import { z } from 'zod';
import { Id } from './common.js';
import { FileOwnerType, FileKind } from '../enums.js';

export const FileObject = z.object({
  id: Id,
  ownerType: FileOwnerType,
  ownerId: Id,
  bucket: z.string(),
  key: z.string(),
  kind: FileKind,
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string().url().optional(), // presigned, when requested
  createdAt: z.string().datetime(),
});
export type FileObject = z.infer<typeof FileObject>;

/** Request a presigned PUT URL; client uploads directly to MinIO. */
export const PresignUploadInput = z.object({
  ownerType: FileOwnerType,
  ownerId: Id,
  kind: FileKind,
  contentType: z.string().min(1),
  filename: z.string().min(1),
});
export type PresignUploadInput = z.infer<typeof PresignUploadInput>;

export const PresignUploadResponse = z.object({
  fileId: Id,
  uploadUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int(),
});
export type PresignUploadResponse = z.infer<typeof PresignUploadResponse>;
