import { octokit } from '@/lib/octokit.server';
import { TransactionalPrismaClient } from '@/lib/prisma.server';
import { MutationName } from '@/lib/replicache/mutators';

import { TodoCreateArgs, TodoDeleteArgs } from '@/types/todo';

export const backendMutators = {
  todoCreate: async (
    tx: TransactionalPrismaClient,
    args: TodoCreateArgs,
    version: number
  ) => {
    const issue = await octokit.rest.issues.create({
      owner: 'rtpa25',
      repo: 'dimension-dump',
      title: args.title,
      body: `${args.description ?? ''}
      Created from learn-replicache-prisma app
      `,
    });

    await tx.todo.create({
      data: {
        ...args,
        version,
        GithubIssue: {
          create: {
            number: issue.data.number,
            owner: issue.data.user?.login ?? '',
            repo: issue.data.repository?.name ?? '',
            id: issue.data.node_id,
          },
        },
      },
    });
  },
  todoDelete: async (
    tx: TransactionalPrismaClient,
    args: TodoDeleteArgs,
    version: number
  ) => {
    const updatedTodo = await tx.todo.update({
      where: {
        id: args.id,
      },
      data: {
        isDeleted: true,
        version,
      },
      select: {
        GithubIssue: true,
      },
    });

    await octokit.rest.issues.update({
      owner: updatedTodo.GithubIssue?.owner ?? '',
      repo: updatedTodo.GithubIssue?.repo ?? '',
      issue_number: updatedTodo.GithubIssue?.number ?? 0,
      state: 'closed',
    });
  },
} satisfies Record<MutationName, object>;
