import { z } from 'zod';
import { apiRequest, isUnauthorized } from '@/lib/api-client';
import { userSchema, type User } from '@/types/ticket';

const authResponseSchema = z.object({ user: userSchema });

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export async function login(input: LoginInput): Promise<User> {
  const { user } = await apiRequest('/auth/login', authResponseSchema, {
    method: 'POST',
    body: input,
  });
  return user;
}

export async function register(input: RegisterInput): Promise<User> {
  const { user } = await apiRequest('/auth/register', authResponseSchema, {
    method: 'POST',
    body: input,
  });
  return user;
}

export async function logout(): Promise<void> {
  await apiRequest('/auth/logout', z.null(), { method: 'POST' });
}

// A 401 just means signed-out, so return null instead of throwing.
export async function fetchMe(): Promise<User | null> {
  try {
    const { user } = await apiRequest('/auth/me', authResponseSchema);
    return user;
  } catch (error) {
    if (isUnauthorized(error)) return null;
    throw error;
  }
}
