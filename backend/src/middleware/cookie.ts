import type { Response } from 'express';
import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'auth_token';

const isProduction = process.env.NODE_ENV === 'production';

const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions);
}
