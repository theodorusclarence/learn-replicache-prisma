import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class SpaceService {
  constructor(private tx: TransactionalPrismaClient) {}

  async create() {
    return this.tx.space.create({
      data: {}, // default version --> 0
    });
  }

  async updateVersion(id: string, version: number) {
    return this.tx.space.update({
      where: {
        id,
      },
      data: {
        version,
      },
    });
  }

  async incrementVersion(id: string) {
    return this.tx.space.update({
      where: {
        id,
      },
      data: {
        version: {
          increment: 1,
        },
      },
    });
  }

  async delete() {
    throw new Error('Not implemented');
  }

  async getById(id: string) {
    return this.tx.space.findUnique({
      where: {
        id,
      },
    });
  }
}
