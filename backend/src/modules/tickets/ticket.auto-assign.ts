import { Prisma, Role } from '@prisma/client';

/** Runs inside the caller's transaction so the pick and the write cannot drift. */
type Tx = Prisma.TransactionClient;

/** Round-robin: the agent idle longest is next, never-assigned first. */
export async function pickNextAgentId(tx: Tx): Promise<string | null> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT u."id"
    FROM "User" u
    LEFT JOIN "Assignment" a ON a."agentId" = u."id"
    WHERE u."role" = ${Role.AGENT}::"Role"
    GROUP BY u."id"
    ORDER BY max(a."assignedAt") ASC NULLS FIRST, u."id" ASC
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/** Actor for system transitions. Sentinel password, not a hash — never logs in. */
export const SYSTEM_USER_EMAIL = 'system@helpdesk.test';

let cachedSystemUserId: string | null = null;

export async function getSystemUserId(tx: Tx): Promise<string> {
  if (cachedSystemUserId) {
    return cachedSystemUserId;
  }
  const user = await tx.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      email: SYSTEM_USER_EMAIL,
      name: 'Auto-assignment',
      role: Role.ADMIN,
      password: '!no-login',
    },
    select: { id: true },
  });
  cachedSystemUserId = user.id;
  return user.id;
}
