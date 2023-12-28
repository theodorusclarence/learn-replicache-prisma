import {
  TodoCreateArgs,
  TodoDeleteArgs,
  TodoUpdateArgs,
} from '@/models/todo.model';
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

    const todo = await this.tx.todo.create({
      data: {
        ...args,
        spaceId,
        version,
      },
    });

    await this.tx.event.create({
      data: {
        todoId: todo.id,
        type: 'CREATE_ISSUE',
        spaceId,
      },
    });

    return todo;
  }

  async update(
    args: TodoUpdateArgs,
    version: number,
    spaceId: string,
    githubSyncEnabled?: boolean
  ) {
    const { labelOnIssues, ...rest } = args;

    const todo = await this.tx.todo.update({
      where: { id: args.id },
      data: {
        spaceId,
        version,
        ...rest,
        labelOnIssues: {},
      },
      include: {
        labelOnIssues: {
          include: {
            label: true,
          },
        },
      },
    });

    const lablesToAdd = labelOnIssues?.filter(
      (loi) =>
        !todo.labelOnIssues?.some(
          (loi2) => loi2.labelId === loi.labelId && loi2.todoId === loi.todoId
        )
    );

    const labelsToRemove = todo.labelOnIssues?.filter(
      (loi) =>
        !labelOnIssues?.some(
          (loi2) => loi2.labelId === loi.labelId && loi2.todoId === loi.todoId
        )
    );

    await this.tx.labelOnIssues.deleteMany({
      where: {
        AND: [
          {
            todoId: todo.id,
          },
          {
            labelId: {
              in: labelsToRemove?.map((loi) => loi.labelId) ?? [],
            },
          },
        ],
      },
    });

    for (const label of lablesToAdd ?? []) {
      await this.tx.label.upsert({
        where: {
          id: label.labelId,
        },
        create: {
          id: label.labelId,
          name: label.label.name,
          color: label.label.color,
          LabelOnIssues: {
            create: {
              todoId: todo.id,
              id: label.id,
            },
          },
        },
        update: {
          LabelOnIssues: {
            connectOrCreate: {
              where: {
                label_id_todo_id: {
                  labelId: label.labelId,
                  todoId: todo.id,
                },
              },
              create: {
                id: label.id,
                todoId: todo.id,
              },
            },
          },
        },
      });
    }

    if (githubSyncEnabled) {
      await this.tx.event.upsert({
        where: { todo_id_type: { todoId: todo.id, type: 'SYNC_ISSUE' } },
        create: { todoId: todo.id, type: 'SYNC_ISSUE', spaceId },
        update: { status: null },
      });
    }

    return todo;
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
        version: { gte: gtVersion ?? 0 },
      },
      include: {
        GithubIssue: true,
        labelOnIssues: {
          include: {
            label: true,
          },
        },
        project: true,
      },
    });
  }
}
