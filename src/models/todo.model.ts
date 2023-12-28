import { Prisma, Todo } from '@prisma/client';

export type TodoDetail = Prisma.TodoGetPayload<{
  include: {
    GithubIssue: true;
    labelOnIssues: {
      include: {
        label: true;
      };
    };
    project: true;
  };
}>;
export type TodoCreateArgs = Omit<
  Todo,
  'isDeleted' | 'lastModified' | 'completed' | 'version' | 'spaceId'
>;
export type TodoDeleteArgs = Pick<Todo, 'id'>;

export type TodoUpdateArgs = Partial<Todo> &
  Partial<Pick<TodoDetail, 'labelOnIssues'>>;
