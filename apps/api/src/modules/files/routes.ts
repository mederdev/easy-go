import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { PresignUploadInput, Id } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { BUCKET, presignedPut, presignedGet } from '../../lib/minio.js';

function extOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i) : '';
}

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authorize(['operator', 'admin', 'owner']));

  // Step 1: register the file + hand back a presigned PUT URL.
  app.post('/presign', async (request) => {
    const input = parse(PresignUploadInput, request.body);
    const key = `${input.ownerType.toLowerCase()}/${input.ownerId}/${randomUUID()}${extOf(input.filename)}`;

    const file = await prisma.fileObject.create({
      data: {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        bucket: BUCKET,
        key,
        kind: input.kind,
        contentType: input.contentType,
        size: 0,
      },
    });

    const uploadUrl = await presignedPut(key, 600);
    return { fileId: file.id, uploadUrl, key, expiresIn: 600 };
  });

  // Step 2 (optional): client reports final size after a successful PUT.
  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { size } = request.body as { size?: number };
    return prisma.fileObject.update({ where: { id: parse(Id, id) }, data: { size: size ?? 0 } });
  });

  // List files for an owner with fresh presigned GET URLs.
  app.get('/', async (request) => {
    const { ownerType, ownerId } = request.query as { ownerType?: string; ownerId?: string };
    if (!ownerType || !ownerId) throw Errors.badRequest('Требуются ownerType и ownerId');
    const files = await prisma.fileObject.findMany({
      where: { ownerType: ownerType as never, ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      files.map(async (f) => ({ ...f, url: await presignedGet(f.key, 3600) })),
    );
  });
};

export default routes;
