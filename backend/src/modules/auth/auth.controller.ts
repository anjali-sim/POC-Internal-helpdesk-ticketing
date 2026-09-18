import type { NextFunction, Request, Response } from 'express';

import { clearAuthCookie, setAuthCookie } from '../../middleware/cookie';
import { UnauthorizedError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { loginUser, registerUser } from './auth.service';
import type { LoginInput, RegisterInput } from './auth.schema';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, user } = await registerUser(req.body as RegisterInput);
    setAuthCookie(res, token);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, user } = await loginUser(req.body as LoginInput);
    setAuthCookie(res, token);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedError();
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
