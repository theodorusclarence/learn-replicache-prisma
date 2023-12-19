import { TransactionalPrismaClient } from '@/lib/prisma.server';
import { MutationName } from '@/lib/replicache/mutators';

import { TodoCreateArgs, TodoDeleteArgs } from '@/types/todo';

export const backendMutators = {
  todoCreate: async (
    tx: TransactionalPrismaClient,
    args: TodoCreateArgs,
    version: number
  ) => {
    await tx.todo.create({
      data: {
        ...args,
        version,
      },
    });
  },
  todoDelete: async (
    tx: TransactionalPrismaClient,
    args: TodoDeleteArgs,
    version: number
  ) => {
    await tx.todo.update({
      where: {
        id: args.id,
      },
      data: {
        isDeleted: true,
        version,
      },
    });
  },
} satisfies Record<MutationName, object>;
