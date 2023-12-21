import { Todo } from '@prisma/client';

export type TodoWithoutDate = Omit<Todo, 'lastModified'>;

export type TodoCreateArgs = Omit<
  Todo,
  'isDeleted' | 'lastModified' | 'completed' | 'version'
>;
export type TodoDeleteArgs = Pick<Todo, 'id' | 'spaceId'>;
