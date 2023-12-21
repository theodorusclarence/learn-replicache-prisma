import { nanoid } from 'nanoid';

import { SpaceService } from '@/lib/server/services/space.service';

import { UserCreateArgs } from '@/models/user.model';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class UserService {
  private spaceService: SpaceService;
  constructor(private tx: TransactionalPrismaClient) {
    this.spaceService = new SpaceService(tx);
  }

  /**
   *
   * Create's a new user, and it's associated
   * space
   *
   */
  async create(args: UserCreateArgs) {
    const space = await this.spaceService.create();
    await this.tx.user.create({
      data: {
        ...args,
        id: args.id ?? nanoid(),
        spaceId: space.id,
      },
    });
  }

  async update() {
    throw new Error('Not implemented');
  }

  async delete() {
    throw new Error('Not implemented');
  }
}
