import { PrismaClient, Role } from '@prisma/client';

import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';

const USERS: Array<{ name: string; email: string; role: Role }> = [
  { name: 'Ada Admin', email: 'admin@helpdesk.test', role: Role.ADMIN },
  { name: 'Alex Agent', email: 'agent1@helpdesk.test', role: Role.AGENT },
  { name: 'Amara Agent', email: 'agent2@helpdesk.test', role: Role.AGENT },
];

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

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
