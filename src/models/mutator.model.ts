import { WriteTransaction } from 'replicache';

import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

type Mutator<Type = 'client' | 'server', Args = object> = Type extends 'client'
  ? (tx: WriteTransaction, args: Args) => Promise<void>
  : (
      tx: TransactionalPrismaClient,
      args: Args,
      version: number
    ) => Promise<void>;

export type M<Type = 'client' | 'server'> = {
  todoCreate: Mutator<Type, TodoCreateArgs>;
  todoDelete: Mutator<Type, TodoDeleteArgs>;
};
