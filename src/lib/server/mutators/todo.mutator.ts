import { TodoService } from '@/lib/server/services';

import { TodoMutators } from '@/models/mutator/todo.model';

const GITHUB_SYNC_ENABLED = process.env.NEXT_PUBLIC_SYNC_WITH_GITHUB === 'true';

export const serverTodoMutators: TodoMutators<'server'> = {
  todoCreate: async (tx, args, version, spaceId) => {
    const todoService = new TodoService(tx);

    await todoService.create(args, version, spaceId, GITHUB_SYNC_ENABLED);
  },
  todoDelete: async (tx, args, version, spaceId) => {
    const todoService = new TodoService(tx);

    await todoService.delete(args, version, spaceId, GITHUB_SYNC_ENABLED);
  },
};
