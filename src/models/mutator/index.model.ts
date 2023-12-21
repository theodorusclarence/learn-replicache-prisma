import { WriteTransaction } from 'replicache';

import { TodoMutators } from '@/models/mutator/todo.model';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

export type Mutator<
  Type = 'client' | 'server',
  Args = object
> = Type extends 'client'
  ? (tx: WriteTransaction, args: Args) => Promise<void>
  : (
      tx: TransactionalPrismaClient,
      args: Args,
      version: number
    ) => Promise<void>;

export type M<Type = 'client' | 'server'> = TodoMutators<Type>;
