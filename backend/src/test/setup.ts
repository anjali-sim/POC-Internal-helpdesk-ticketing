/**
 * Runs before every test file, ahead of any application import.
 *
 * Several modules read env at import time (jwt reads JWT_SECRET/JWT_EXPIRES_IN,
 * cookie reads NODE_ENV, logger reads LOG_LEVEL), so the values have to be in
 * place here rather than inside a test.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-outside-tests';
process.env.JWT_EXPIRES_IN = '1d';
process.env.CORS_ORIGIN = 'http://localhost:5173';
// Keep pino quiet; 'silent' also skips the pino-pretty transport worker.
process.env.LOG_LEVEL = 'silent';
// No test touches Postgres — the Prisma client is mocked — but PrismaClient
// still wants a syntactically valid URL when it is constructed.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?schema=public';
