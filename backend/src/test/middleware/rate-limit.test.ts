import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../middleware/errorHandler';
import { createLimiter } from '../../middleware/rate-limit';

function buildApp(limiter: ReturnType<typeof createLimiter>) {
  const app = express();
  app.use(express.json());
  app.post('/x', limiter, (req, res) => {
    res.status(req.body?.fail ? 401 : 200).json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('createLimiter', () => {
  it('returns 429 with the standard error body and Retry-After once the limit is exceeded', async () => {
    const app = buildApp(createLimiter({ windowMs: 60_000, limit: 2, enforceInTest: true }));

    await request(app).post('/x').expect(200);
    await request(app).post('/x').expect(200);
    const res = await request(app).post('/x').expect(429);

    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('keeps separate counters per key', async () => {
    const app = buildApp(
      createLimiter({
        windowMs: 60_000,
        limit: 1,
        enforceInTest: true,
        key: (req) => String(req.body?.email),
      }),
    );

    await request(app).post('/x').send({ email: 'a@x.com' }).expect(200);
    await request(app).post('/x').send({ email: 'a@x.com' }).expect(429);
    await request(app).post('/x').send({ email: 'b@x.com' }).expect(200);
  });

  it('with skipSuccessfulRequests only failed responses count', async () => {
    const app = buildApp(
      createLimiter({
        windowMs: 60_000,
        limit: 2,
        enforceInTest: true,
        skipSuccessfulRequests: true,
      }),
    );

    for (let i = 0; i < 5; i++) await request(app).post('/x').expect(200);
    await request(app).post('/x').send({ fail: true }).expect(401);
    await request(app).post('/x').send({ fail: true }).expect(401);
    await request(app).post('/x').send({ fail: true }).expect(429);
  });

  it('is skipped under NODE_ENV=test unless enforceInTest is set', async () => {
    const app = buildApp(createLimiter({ windowMs: 60_000, limit: 1 }));
    await request(app).post('/x').expect(200);
    await request(app).post('/x').expect(200);
  });
});
