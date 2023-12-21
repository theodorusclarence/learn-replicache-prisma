import { WriteTransaction } from 'replicache';

import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';

export abstract class Mutators {
  public abstract todoCreate(
    tx?: WriteTransaction,
    args?: TodoCreateArgs,
    version?: number
  ): Promise<void>;

  public abstract todoDelete(
    tx?: WriteTransaction,
    args?: TodoDeleteArgs,
    version?: number
  ): Promise<void>;
}

export type M = {
  todoCreate: Mutators['todoCreate'];
  todoDelete: Mutators['todoDelete'];
};
