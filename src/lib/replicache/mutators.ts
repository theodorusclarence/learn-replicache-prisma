import { WriteTransaction } from 'replicache';

import { TodoCreateArgs } from '@/types/todo';

export const mutators = {
  async todoCreate(tx: WriteTransaction, args: TodoCreateArgs) {
    await tx.set(`${args.spaceId}/todo/${args.id}`, args);
  },
};

export type M = typeof mutators;
