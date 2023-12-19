import { TransactionalPrismaClient } from '@/lib/prisma.server';

import { TodoCreateArgs } from '@/types/todo';

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
};
