import { ClientCreateArgs, ClientUpdateArgs } from '@/models/client.model';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class ClientService {
  constructor(private tx: TransactionalPrismaClient) {}

  async update(args: ClientUpdateArgs) {
    return this.tx.client.update({
      where: {
        id: args.id,
      },
      data: {
        lastMutationId: args.lastMutationId,
        version: args.version,
      },
    });
  }

  async createMany(args: ClientCreateArgs[]) {
    return this.tx.client.createMany({
      data: args,
    });
  }

  async findManyInClientGroup(clientGroupId: string, versionGt: number) {
    return this.tx.client.findMany({
      where: {
        clientGroupId,
        version: {
          gt: versionGt,
        },
      },
    });
  }

  async findManyByIds(ids: string[]) {
    return this.tx.client.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
