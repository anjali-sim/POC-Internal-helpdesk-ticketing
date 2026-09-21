import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth';
import { listAgents } from './user.controller';

export const userRouter = Router();

userRouter.use(requireAuth);

// Requesters have no reason to enumerate staff, so this stays agent/admin only.
userRouter.get('/agents', requireRole(Role.AGENT, Role.ADMIN), listAgents);
