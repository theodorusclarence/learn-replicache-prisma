import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.space.create({
    data: {
      version: 0,
      id: 'dummy-space-id',
    },
  });
  await prisma.space.create({
    data: {
      version: 0,
      id: 'dummy-space-id-2',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })

  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });
