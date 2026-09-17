import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

const JWT_EXPIRES_IN: NonNullable<SignOptions['expiresIn']> = (process.env.JWT_EXPIRES_IN ??
  '1d') as NonNullable<SignOptions['expiresIn']>;

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === 'string' || !('sub' in decoded) || !('role' in decoded)) {
    throw new Error('Malformed token payload');
  }
  return { sub: decoded.sub as string, role: decoded.role as AuthTokenPayload['role'] };
}
