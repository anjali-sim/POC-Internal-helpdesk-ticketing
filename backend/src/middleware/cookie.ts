import type { Response } from 'express';
import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'auth_token';

const isProduction = process.env.NODE_ENV === 'production';

const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// In production the SPA may call the API on a different origin (the deployed
// frontend talks straight to the API host unless it proxies /api itself), and
// browsers neither store nor send a SameSite=Lax cookie on a cross-site fetch --
// login would succeed and every later request would come back 401. SameSite=None
// covers both layouts; it requires Secure, which production has anyway.
// Locally we stay on Lax: None without Secure is rejected over plain http.
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
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
