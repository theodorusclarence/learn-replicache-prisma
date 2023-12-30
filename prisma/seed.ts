import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(
    async (tx) => {
      await tx.space.deleteMany({});
      await tx.project.deleteMany({});
      await tx.client.deleteMany({});
      await tx.clientGroup.deleteMany({});
      await tx.space.create({
        data: {
          version: 0,
          id: 'dummy-space-id-01',
        },
      });
      await tx.space.create({
        data: {
          version: 0,
          id: 'dummy-space-id-02',
        },
      });

      await tx.project.create({
        data: {
          version: 0,
          id: 'dummy-project-id-01',
          name: 'project 01',
          spaceId: 'dummy-space-id-01',
        },
      });
      await tx.project.create({
        data: {
          version: 0,
          id: 'dummy-project-id-02',
          name: 'project 01',
          spaceId: 'dummy-space-id-02',
        },
      });
      return true;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 12000,
    }
  );
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
