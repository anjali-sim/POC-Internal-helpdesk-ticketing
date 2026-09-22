import type { ZodType } from 'zod';

// Same-origin by default via the Vite proxy; set VITE_API_BASE_URL for a remote API.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Extra fields the server attaches to an ILLEGAL_TRANSITION rejection. */
export interface IllegalTransitionDetails {
  from: string;
  to: string;
  allowedTransitions: string[];
}

interface ErrorPayload {
  code?: unknown;
  message?: unknown;
  from?: unknown;
  to?: unknown;
  allowedTransitions?: unknown;
}

// A deliberate API rejection; the UI branches on `code`, e.g. ILLEGAL_TRANSITION.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly illegalTransition: IllegalTransitionDetails | null;

  constructor(
    status: number,
    code: string,
    message: string,
    illegalTransition: IllegalTransitionDetails | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.illegalTransition = illegalTransition;
  }

  static fromResponse(status: number, payload: unknown): ApiError {
    const error = (payload as { error?: ErrorPayload } | null)?.error;

    const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR';
    const message =
      typeof error?.message === 'string' ? error.message : `Request failed with status ${status}`;

    const { from, to, allowedTransitions } = error ?? {};
    const illegalTransition =
      code === 'ILLEGAL_TRANSITION' &&
      typeof from === 'string' &&
      typeof to === 'string' &&
      Array.isArray(allowedTransitions)
        ? { from, to, allowedTransitions: allowedTransitions as string[] }
        : null;

    return new ApiError(status, code, message, illegalTransition);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when the session is missing or expired and the user must sign in again. */
export function isUnauthorized(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

type QueryParams = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // A proxy or crash can hand back HTML where JSON was promised.
    return null;
  }
}

// Single choke point: attaches the cookie, throws typed ApiError, validates the body.
export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      // Sends the httpOnly auth cookie along with the request.
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the API running?');
  }

  const payload = response.status === 204 ? null : await readPayload(response);

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      'RESPONSE_SHAPE_ERROR',
      `Unexpected response from ${path}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
  }
  return parsed.data;
}
