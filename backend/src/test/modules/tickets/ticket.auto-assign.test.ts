import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPrismaMock } from '../../prisma-mock';

/**
 * `getSystemUserId` memoises in a module-level variable, so each test here
 * imports the module fresh rather than sharing a warm cache.
 */
async function freshModule() {
  vi.resetModules();
  return import('../../../modules/tickets/ticket.auto-assign');
}

type Tx = ReturnType<typeof createPrismaMock>;

let tx: Tx;

beforeEach(() => {
  tx = createPrismaMock();
});

describe('pickNextAgentId', () => {
  it('returns the id the round-robin query selects', async () => {
    const { pickNextAgentId } = await freshModule();
    tx.$queryRaw.mockResolvedValue([{ id: 'agent_idle_longest' }]);

    await expect(pickNextAgentId(tx as never)).resolves.toBe('agent_idle_longest');
  });

  it('returns null when there are no agents at all', async () => {
    const { pickNextAgentId } = await freshModule();
    tx.$queryRaw.mockResolvedValue([]);

    await expect(pickNextAgentId(tx as never)).resolves.toBeNull();
  });

  it('runs the query on the caller’s transaction client', async () => {
    const { pickNextAgentId } = await freshModule();
    tx.$queryRaw.mockResolvedValue([]);

    await pickNextAgentId(tx as never);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('only considers users with the AGENT role', async () => {
    const { pickNextAgentId } = await freshModule();
    tx.$queryRaw.mockResolvedValue([]);

    await pickNextAgentId(tx as never);

    // Prisma's tagged template passes interpolated values after the strings array.
    expect(tx.$queryRaw.mock.calls[0]?.[1]).toBe(Role.AGENT);
  });
});

describe('getSystemUserId', () => {
  it('upserts the system user and returns its id', async () => {
    const { getSystemUserId, SYSTEM_USER_EMAIL } = await freshModule();
    tx.user.upsert.mockResolvedValue({ id: 'user_system' });

    await expect(getSystemUserId(tx as never)).resolves.toBe('user_system');
    expect(tx.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: SYSTEM_USER_EMAIL } }),
    );
  });

  it('creates the system user as a REQUESTER so the round-robin never picks it', async () => {
    const { getSystemUserId } = await freshModule();
    tx.user.upsert.mockResolvedValue({ id: 'user_system' });

    await getSystemUserId(tx as never);

    const { create } = tx.user.upsert.mock.calls[0]?.[0] as {
      create: { role: Role; password: string };
    };
    expect(create.role).toBe(Role.REQUESTER);
    // A sentinel, not a bcrypt hash: nothing can ever log in as this account.
    expect(create.password).not.toMatch(/^\$2[aby]\$/);
  });

  it('leaves any existing row untouched', async () => {
    const { getSystemUserId } = await freshModule();
    tx.user.upsert.mockResolvedValue({ id: 'user_system' });

    await getSystemUserId(tx as never);

    const { update } = tx.user.upsert.mock.calls[0]?.[0] as { update: Record<string, unknown> };
    expect(update).toEqual({});
  });

  it('caches the id, so repeat calls do not hit the database', async () => {
    const { getSystemUserId } = await freshModule();
    tx.user.upsert.mockResolvedValue({ id: 'user_system' });

    await getSystemUserId(tx as never);
    const second = await getSystemUserId(tx as never);

    expect(second).toBe('user_system');
    expect(tx.user.upsert).toHaveBeenCalledTimes(1);
  });
});
