import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';
import { octokit } from '@/utils/server/octokit';
import { TransactionalPrismaClient } from '@/utils/server/prisma';
import { octokitQueue } from '@/workers/octokit.worker';

export class TodoService {
  constructor(private tx: TransactionalPrismaClient) {}

  /**
   *
   * Create's a new todo and create's a new issue on Github
   * associated with the todo.
   *
   */
  async create(
    args: TodoCreateArgs,
    version: number,
    spaceId: string,
    githubSyncEnabled?: boolean
  ) {
    if (!githubSyncEnabled) {
      return this.tx.todo.create({
        data: {
          ...args,
          spaceId,
          version,
        },
      });
    }
    // const issue = await octokit.rest.issues.create({
    //   owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'theodorusclarence',
    //   repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
    //   title: `${args.id}/${args.title}`,
    //   body: `${args.description ?? ''}
    //   Created from learn-replicache-prisma app
    //   `,
    // });

    const todo = await this.tx.todo.create({
      data: {
        ...args,
        spaceId,
        version,
      },
    });

    // await this.tx.event.create({
    //   data: {
    //     type: 'CREATE_ISSUE',
    //     todoId: todo.id,
    //   },
    // });
    // push the event to the queue here
    await octokitQueue.add(
      'create-issue',
      {
        todoId: todo.id,
      },
      {
        delay: 5000,
      }
    );
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
  async delete(
    args: TodoDeleteArgs,
    version: number,
    _spaceId: string,
    githubSyncEnabled?: boolean
  ) {
    if (!githubSyncEnabled) {
      return this.tx.todo.update({
        where: {
          id: args.id,
        },
        data: {
          isDeleted: true,
          version,
        },
      });
    }

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
