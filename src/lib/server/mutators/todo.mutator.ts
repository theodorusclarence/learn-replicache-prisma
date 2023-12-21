import { TodoService } from '@/lib/server/services';

import { M } from '@/models/mutator.model';

const GITHUB_SYNC_ENABLED = process.env.NEXT_PUBLIC_SYNC_WITH_GITHUB === 'true';

export const serverMutators: M<'server'> = {
  async todoCreate(tx, args, version) {
    const todoService = new TodoService(tx);

    await todoService.create(args, version, GITHUB_SYNC_ENABLED);
  },
  async todoDelete(tx, args, version) {
    const todoService = new TodoService(tx);

    await todoService.delete(args, version, GITHUB_SYNC_ENABLED);
  },
};
