import { WriteTransaction } from 'replicache';

import { TodoCreateArgs, TodoDeleteArgs } from '@/types/todo';

export const mutators = {
  async todoCreate(tx: WriteTransaction, args: TodoCreateArgs) {
    await tx.set(`${args.spaceId}/todo/${args.id}`, args);
  },
  async todoDelete(tx: WriteTransaction, args: TodoDeleteArgs) {
    await tx.del(`${args.spaceId}/todo/${args.id}`);
  },
};

export type M = typeof mutators;
export type MutationName = keyof M;
