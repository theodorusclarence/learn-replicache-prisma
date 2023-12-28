import { IDB_KEY } from '@/models/idb-key.model';
import { TodoMutators } from '@/models/mutator/todo.model';
import { removeUndefinedFromObject } from '@/utils/client/helpers';

export const clientTodoMutators: (spaceId: string) => TodoMutators<'client'> = (
  spaceId
) => ({
  async todoCreate(tx, args) {
    const project = await tx.get(IDB_KEY.PROJECT({ spaceId, id: args.id }));

    await tx.set(
      IDB_KEY.TODO({ spaceId, id: args.id }),
      removeUndefinedFromObject({
        ...args,
        project,
      })
    );
  },
  async todoDelete(tx, args) {
    await tx.del(IDB_KEY.TODO({ spaceId, id: args.id }));
  },
  async todoUpdate(tx, args) {
    const oldTodo = await tx.get(IDB_KEY.TODO({ spaceId, id: args.id }));

    await tx.set(
      IDB_KEY.TODO({ spaceId, id: args.id }),
      removeUndefinedFromObject({
        ...(typeof oldTodo === 'object' ? oldTodo : {}),
        ...args,
        lastModified: new Date().toISOString(),
      })
    );
  },
});
