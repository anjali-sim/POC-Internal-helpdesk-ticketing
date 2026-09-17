import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { login, logout, me, register } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
