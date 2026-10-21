import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { loginLimiter, registerLimiter } from '../../middleware/rate-limit';
import { validateBody } from '../../middleware/validate';
import { login, logout, me, register } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validateBody(registerSchema), register);
authRouter.post('/login', loginLimiter, validateBody(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
