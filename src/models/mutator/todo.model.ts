import { Mutator } from '@/models/mutator/index.model';
import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';

export type TodoMutators<Type = 'client' | 'server'> = {
  todoCreate: Mutator<Type, TodoCreateArgs>;
  todoDelete: Mutator<Type, TodoDeleteArgs>;
};
