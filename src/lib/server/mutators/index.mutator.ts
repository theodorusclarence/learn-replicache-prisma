import { serverProjectMutator } from '@/lib/server/mutators/project.mutator';
import { serverTodoMutators } from '@/lib/server/mutators/todo.mutator';

import { M } from '@/models/mutator/index.model';

export const serverMutators: M<'server'> = {
  ...serverTodoMutators,
  ...serverProjectMutator,
};
