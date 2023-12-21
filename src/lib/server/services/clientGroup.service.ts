import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class ClientGroupService {
  constructor(private tx: TransactionalPrismaClient) {}

  async createIfNotExists(id: string) {
    return this.tx.clientGroup.upsert({
      where: {
        id,
      },
      create: {
        id,
      },
      update: {},
    });
  }
}
