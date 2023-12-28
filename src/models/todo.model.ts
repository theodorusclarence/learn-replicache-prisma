import { Prisma, Todo } from '@prisma/client';

export type TodoDetail = Prisma.TodoGetPayload<{
  include: {
    GithubIssue: true;
    project: true;
  };
}>;

// Put this in type helper
type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
type PartialExcept<T, K extends keyof T> = RecursivePartial<T> & Pick<T, K>;

export type TodoCreateArgs = RecursivePartial<
  Omit<
    TodoDetail,
    'isDeleted' | 'lastModified' | 'completed' | 'version' | 'spaceId'
  >
>;

export type TodoDeleteArgs = Pick<Todo, 'id'>;

export type TodoUpdateArgs = Omit<
  Todo,
  'isDeleted' | 'lastModified' | 'completed' | 'version' | 'spaceId'
>;
