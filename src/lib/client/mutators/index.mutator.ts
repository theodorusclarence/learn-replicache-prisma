import { clientProjectMutators } from '@/lib/client/mutators/project.mutator';
import { clientTodoMutators } from '@/lib/client/mutators/todo.mutator';

import { M } from '@/models/mutator/index.model';

export const clientMutators: (spaceId: string) => M<'client'> = (spaceId) => ({
  ...clientTodoMutators(spaceId),
  ...clientProjectMutators(spaceId),
});
