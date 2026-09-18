import { Role } from '@prisma/client';

import { ConflictError, UnauthorizedError } from '../../lib/errors';
import { signAuthToken } from '../../lib/jwt';
import { comparePassword, hashPassword } from '../../lib/password';
import { prisma } from '../../lib/prisma';
import type { LoginInput, RegisterInput } from './auth.schema';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: Role.REQUESTER,
    },
  });

  const token = signAuthToken({ sub: user.id, role: user.role });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordMatches = await comparePassword(input.password, user.password);
  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signAuthToken({ sub: user.id, role: user.role });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
