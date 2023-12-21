import { clientTodoMutators } from '@/lib/client/mutators/todo.mutator';

import { M } from '@/models/mutator/index.model';

export const clientMutators: M<'client'> = {
  ...clientTodoMutators,
};
