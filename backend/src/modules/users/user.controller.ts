import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';

import { prisma } from '../../lib/prisma';

/** Agents available for assignment — used to populate the assign control. */
export async function listAgents(_req: Request, res: Response, next: NextFunction) {
  try {
    const agents = await prisma.user.findMany({
      where: { role: Role.AGENT },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ agents });
  } catch (err) {
    next(err);
  }
}
