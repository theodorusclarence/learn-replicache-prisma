import { IDB_KEY } from '@/models/idb-key.model';
import { ProjectMutators } from '@/models/mutator/project.model';

export const clientProjectMutators: (
  spaceId: string
) => ProjectMutators<'client'> = (spaceId) => ({
  async projectCreate(tx, args) {
    await tx.set(IDB_KEY.PROJECT({ spaceId, id: args.id }), args);
  },
  async projectDelete(tx, args) {
    await tx.del(IDB_KEY.PROJECT({ spaceId, id: args.id }));
  },
  async projectUpdate(tx, args) {
    await tx.set(IDB_KEY.PROJECT({ spaceId, id: args.id }), args);
  },
});
