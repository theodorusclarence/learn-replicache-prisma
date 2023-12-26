import { ProjectMutators } from '@/models/mutator/project.model';

export const clientProjectMutators: (
  spaceId: string
) => ProjectMutators<'client'> = (spaceId) => ({
  async projectCreate(tx, args) {
    await tx.set(`${spaceId}/project/${args.id}`, args);
  },
  async projectDelete(tx, args) {
    await tx.del(`${spaceId}/project/${args.id}`);
  },
  async projectUpdate(tx, args) {
    await tx.set(`${spaceId}/project/${args.id}`, args);
  },
});
