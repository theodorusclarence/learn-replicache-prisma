import { Prisma, Tag, Todo } from '@prisma/client';

import { NormalizePrisma } from '@/utils/type-helpers';

export type TodoDetail = Prisma.TodoGetPayload<{
  include: {
    GithubIssue: true;
    project: true;
    tags: true;
  };
}>;
export type TodoCreateArgs = Omit<
  Todo,
  'isDeleted' | 'lastModified' | 'completed' | 'version' | 'spaceId'
>;
export type TodoDeleteArgs = Pick<Todo, 'id'>;

export type TodoUpdateArgs = Partial<Todo> & {
  id: Todo['id'];
  tags?: Omit<NormalizePrisma<Tag>, 'todoId'>[];
};
