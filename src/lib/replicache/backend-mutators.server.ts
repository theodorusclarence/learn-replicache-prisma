import { octokit } from '@/lib/octokit.server';
import { TransactionalPrismaClient } from '@/lib/prisma.server';
import { MutationName } from '@/lib/replicache/mutators';

import { TodoCreateArgs, TodoDeleteArgs } from '@/types/todo';

const GITHUB_SYNC_ENABLED = process.env.NEXT_PUBLIC_SYNC_WITH_GITHUB === 'true';

export const backendMutators = {
  todoCreate: async (
    tx: TransactionalPrismaClient,
    args: TodoCreateArgs,
    version: number
  ) => {
    if (!GITHUB_SYNC_ENABLED) {
      await tx.todo.create({
        data: {
          ...args,
          version,
        },
      });
      return;
    }

    const issue = await octokit.rest.issues.create({
      owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'theodorusclarence',
      repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
      title: `${args.id}/${args.title}`,
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
            repo: issue.data.repository_url.split('/').pop() ?? '',
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
    if (!GITHUB_SYNC_ENABLED) {
      await tx.todo.update({
        where: {
          id: args.id,
        },
        data: {
          isDeleted: true,
          version,
        },
      });
      return;
    }

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
