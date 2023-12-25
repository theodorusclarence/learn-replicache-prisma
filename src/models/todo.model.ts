import { Todo } from '@prisma/client';

export type TodoCreateArgs = Omit<
  Todo,
  'isDeleted' | 'lastModified' | 'completed' | 'version' | 'spaceId'
>;
export type TodoDeleteArgs = Pick<Todo, 'id'>;
