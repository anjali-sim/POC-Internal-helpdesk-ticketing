import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rate-limit';
import { authRouter } from './modules/auth/auth.routes';
import { ticketRouter } from './modules/tickets/ticket.routes';
import { userRouter } from './modules/users/user.routes';

const app = express();

// Render (and most PaaS) put exactly one proxy in front of the app; without this
// req.ip is the proxy's address and every client would share one rate-limit bucket.
app.set('trust proxy', 1);

app.use(pinoHttp({ logger }));
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// After /health so load-balancer probes are never throttled.
app.use(globalLimiter);

app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/users', userRouter);

app.use(errorHandler);

export default app;
