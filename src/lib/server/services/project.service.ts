import {
  ProjectCreateArgs,
  ProjectDeleteArgs,
  ProjectUpdateArgs,
} from '@/models/project.model';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class ProjectService {
  constructor(private tx: TransactionalPrismaClient) {}

  async create(args: ProjectCreateArgs, version: number, spaceId: string) {
    return this.tx.project.create({
      data: {
        ...args,
        spaceId,
        version,
      },
    });
  }

  async delete(args: ProjectDeleteArgs, version: number) {
    return this.tx.project.update({
      where: {
        id: args.id,
      },
      data: {
        isDeleted: true,
        version,
      },
    });
  }

  async update(args: ProjectUpdateArgs, version: number) {
    return this.tx.project.update({
      where: {
        id: args.id,
      },
      data: {
        name: args.name,
        version,
      },
    });
  }

  async findManyBySpace(spaceId: string, gtVersion?: number) {
    return this.tx.project.findMany({
      where: {
        spaceId,
        version: { gte: gtVersion ?? 0 },
      },
    });
  }
}
