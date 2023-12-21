import { WriteTransaction } from 'replicache';

import { M } from '@/models/mutator.model';
import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';

export const mutators: M = {
  async todoCreate(tx: WriteTransaction, args: TodoCreateArgs) {
    await tx.set(`${args.spaceId}/todo/${args.id}`, args);
  },
  async todoDelete(tx: WriteTransaction, args: TodoDeleteArgs) {
    await tx.del(`${args.spaceId}/todo/${args.id}`);
  },
};
