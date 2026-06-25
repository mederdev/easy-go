/** Domain error with an HTTP status + stable machine code. */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  notFound: (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} не найден`),
  unauthorized: (msg = 'Требуется авторизация') => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Недостаточно прав') => new AppError(403, 'FORBIDDEN', msg),
  conflict: (msg: string, code = 'CONFLICT') => new AppError(409, code, msg),
  badRequest: (msg: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', msg, details),
  validation: (details: unknown) => new AppError(422, 'VALIDATION', 'Ошибка валидации', details),
};
