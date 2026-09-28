import { Role } from '@prisma/client';

import { asyncHandler } from '../../lib/async-handler';
import { prisma } from '../../lib/prisma';

/** Agents available for assignment — used to populate the assign control. */
export const listAgents = asyncHandler(async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: Role.AGENT },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
  res.status(200).json({ agents });
});
