import { TodoMutators } from '@/models/mutator/todo.model';

export const clientTodoMutators: (spaceId: string) => TodoMutators<'client'> = (
  spaceId
) => ({
  async todoCreate(tx, args) {
    await tx.set(`${spaceId}/todo/${args.id}`, args);
  },
  async todoDelete(tx, args) {
    await tx.del(`${spaceId}/todo/${args.id}`);
  },
});
