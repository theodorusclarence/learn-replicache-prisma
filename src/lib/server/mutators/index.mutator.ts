import { serverTodoMutators } from '@/lib/server/mutators/todo.mutator';

import { M } from '@/models/mutator/index.model';

export const serverMutators: M<'server'> = {
  ...serverTodoMutators,
};
