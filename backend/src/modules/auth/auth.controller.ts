import type { Request, Response } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { clearAuthCookie, setAuthCookie } from '../../middleware/cookie';
import { requireUser } from '../../middleware/auth';
import { UnauthorizedError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { loginUser, registerUser } from './auth.service';
import type { LoginInput, RegisterInput } from './auth.schema';

export const register = asyncHandler(async (req, res) => {
  const { token, user } = await registerUser(req.body as RegisterInput);
  setAuthCookie(res, token);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  const { token, user } = await loginUser(req.body as LoginInput);
  setAuthCookie(res, token);
  res.status(200).json({ user });
});

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(204).send();
}

export const me = asyncHandler(async (req, res) => {
  const authUser = requireUser(req);
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    throw new UnauthorizedError();
  }
  res.status(200).json({ user });
});
