import { TodoMutators } from '@/models/mutator/todo.model';

export const clientTodoMutators: TodoMutators<'client'> = {
  async todoCreate(tx, args) {
    await tx.set(`${args.spaceId}/todo/${args.id}`, args);
  },
  async todoDelete(tx, args) {
    await tx.del(`${args.spaceId}/todo/${args.id}`);
  },
};
