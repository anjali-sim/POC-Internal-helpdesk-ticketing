import { PrismaClient, Role } from '@prisma/client';

import { hashPassword } from '../src/lib/password';
import { getSystemUserId } from '../src/modules/tickets/ticket.auto-assign';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';

const USERS: Array<{ name: string; email: string; role: Role }> = [
  { name: 'Alex Agent', email: 'agent1@helpdesk.test', role: Role.AGENT },
  { name: 'Amara Agent', email: 'agent2@helpdesk.test', role: Role.AGENT },
];

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  // Actor for transitions the system performs on its own, such as the
  // round-robin assignment made when a ticket is raised.
  await getSystemUserId(prisma);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: passwordHash },
    });
  }

  console.log(`Seeded ${USERS.length} users. Password for all: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
