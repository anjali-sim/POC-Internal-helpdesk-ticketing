import { vi } from 'vitest';

/**
 * A stand-in for the Prisma client.
 *
 * The API tests exercise routing, auth, validation, mapping and the service
 * rules; the database itself is not under test, so every call is a vi.fn() the
 * test arms with the rows it wants back. That keeps the suite runnable with no
 * Postgres and no migrations.
 */
function model() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export function createPrismaMock() {
  const mock = {
    user: model(),
    ticket: model(),
    assignment: model(),
    comment: model(),
    ticketTransitionLog: model(),
    $queryRaw: vi.fn(),
    // The services use both shapes: `$transaction(async (tx) => ...)` for the
    // write paths and `$transaction([p1, p2])` for the paginated read. The
    // callback form is handed this same mock, so a test arms `prisma.x` once
    // and it applies inside and outside the transaction.
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(mock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
  return mock;
}

/**
 * Factory for `vi.mock('../../lib/prisma', ...)`. Imported lazily inside the
 * mock factory so the hoisted `vi.mock` call never reaches for a binding that
 * has not been initialised yet.
 */
export function prismaMockFactory() {
  return { prisma: createPrismaMock() };
}

/**
 * Clears every armed return value between tests. The mocked module is created
 * once per test file, so without this a `mockResolvedValue` from one test would
 * still be in place for the next. `$transaction` is rebuilt because mockReset
 * drops its implementation along with the queued values.
 */
export function resetPrismaMock(mock: PrismaMock): void {
  for (const value of Object.values(mock)) {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as { mockReset: () => void }).mockReset();
      continue;
    }
    for (const fn of Object.values(value as Record<string, { mockReset: () => void }>)) {
      fn.mockReset();
    }
  }
  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
}
