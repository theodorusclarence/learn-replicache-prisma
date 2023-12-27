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

  await prisma.project.create({
    data: {
      version: 0,
      id: 'IzyVQ8Cha4v0TjFtfA7Mo',
      name: 'project 01',
      spaceId: 'dummy-space-id',
    },
  });
  await prisma.project.create({
    data: {
      version: 0,
      id: 'G7b6uje8qIA6fCHGHr8Rm',
      name: 'project 01',
      spaceId: 'dummy-space-id-2',
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
