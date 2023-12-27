import { TodoMutators } from '@/models/mutator/todo.model';
import { removeUndefinedFromObject } from '@/utils/client/helpers';

export const clientTodoMutators: (spaceId: string) => TodoMutators<'client'> = (
  spaceId
) => ({
  async todoCreate(tx, args) {
    const project = await tx.get(`${spaceId}/project/${args.projectId}`);

    await tx.set(
      `${spaceId}/todo/${args.id}`,
      removeUndefinedFromObject({
        ...args,
        project,
      })
    );
  },
  async todoDelete(tx, args) {
    await tx.del(`${spaceId}/todo/${args.id}`);
  },
});
