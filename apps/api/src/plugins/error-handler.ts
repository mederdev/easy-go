import fp from 'fastify-plugin';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export default fp(async (app) => {
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: `Маршрут ${request.method} ${request.url} не найден` } });
  });

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message, details: err.details } });
    }

    if (err instanceof ZodError) {
      return reply.code(422).send({ error: { code: 'VALIDATION', message: 'Ошибка валидации', details: err.flatten() } });
    }

    // Fastify's own validation (schema-based)
    if ((err as { validation?: unknown }).validation) {
      return reply.code(422).send({ error: { code: 'VALIDATION', message: err.message, details: (err as { validation?: unknown }).validation } });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return reply.code(409).send({ error: { code: 'CONFLICT', message: 'Запись с такими данными уже существует' } });
      }
      if (err.code === 'P2025') {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Запись не найдена' } });
      }
    }

    request.log.error({ err }, 'Unhandled error');
    const message = process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message;
    return reply.code(500).send({ error: { code: 'INTERNAL', message } });
  });
}, { name: 'error-handler' });
