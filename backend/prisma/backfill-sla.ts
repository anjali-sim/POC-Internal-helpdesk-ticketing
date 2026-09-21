/**
 * One-off backfill: tickets raised before SLA due dates existed have NULL
 * deadlines, which the dashboard treats as "not breached". This recomputes them
 * from each ticket's own createdAt using the same business-hours calendar the
 * API uses, so historical rows report the same way new ones do.
 *
 * Safe to re-run — it only touches rows where the deadlines are still NULL.
 */
import { PrismaClient } from '@prisma/client';

import { slaDueDates } from '../src/modules/tickets/ticket.sla';
import { toWirePriority } from '../src/modules/tickets/ticket.state-machine';

const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.ticket.findMany({
    where: { OR: [{ firstResponseDueAt: null }, { resolutionDueAt: null }] },
    select: { id: true, priority: true, createdAt: true },
  });

  for (const ticket of tickets) {
    const { firstResponseDueAt, resolutionDueAt } = slaDueDates(
      toWirePriority(ticket.priority),
      ticket.createdAt,
    );
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { firstResponseDueAt, resolutionDueAt },
    });
  }

  console.log(`Backfilled SLA deadlines for ${tickets.length} ticket(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
