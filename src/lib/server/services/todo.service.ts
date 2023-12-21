import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';
import { octokit } from '@/utils/server/octokit';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class TodoService {
  constructor(private tx: TransactionalPrismaClient) {}

  /**
   *
   * Create's a new todo and create's a new issue on Github
   * associated with the todo.
   *
   */
  async create(args: TodoCreateArgs, version: number) {
    const issue = await octokit.rest.issues.create({
      owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'theodorusclarence',
      repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
      title: `${args.id}/${args.title}`,
      body: `${args.description ?? ''}
      Created from learn-replicache-prisma app
      `,
    });

    return this.tx.todo.create({
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
  }

  async update() {
    throw new Error('Not implemented');
  }

  /**
   *
   * Delete's a todo in our db and close's the
   * associated issue on Github.
   *
   */
  async delete(args: TodoDeleteArgs, version: number) {
    const updatedTodo = await this.tx.todo.update({
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

    return true;
  }

  async findById() {
    throw new Error('Not implemented');
  }

  /**
   *
   * Find's all todo's in a space.
   *
   */
  async findManyBySpace(spaceId: string, gtVersion?: number) {
    return this.tx.todo.findMany({
      where: {
        spaceId,
        version: { gt: gtVersion ?? 0 },
      },
    });
  }
}
