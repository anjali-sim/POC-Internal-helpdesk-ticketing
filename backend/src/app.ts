import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from './lib/logger';

const app = express();

app.use(pinoHttp({ logger }));
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
