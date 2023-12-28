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
    const todo = await this.tx.todo.create({
      data: {
        ...args,
        spaceId,
        version,
      },
    });

    if (githubSyncEnabled) {
      await this.tx.event.create({
        data: {
          todoId: todo.id,
          type: 'CREATE_ISSUE',
          spaceId,
        },
      });
    }

    return todo;
  }

  async update(
    args: TodoUpdateArgs,
    version: number,
    spaceId: string,
    githubSyncEnabled?: boolean
  ) {
    const { labelOnTodos, ...rest } = args;
    const shouldUpdateLabels = Boolean(labelOnTodos);

    const todo = await this.tx.todo.update({
      where: { id: args.id },
      data: {
        spaceId,
        version,
        ...rest,
        labelOnTodos: {},
      },
      include: {
        labelOnTodos: {
          include: {
            label: true,
          },
        },
      },
    });

    if (shouldUpdateLabels) {
      const labelsToRemove = todo.labelOnTodos?.filter(
        (lot) =>
          !labelOnTodos?.some(
            (lot2) => lot2.labelId === lot.labelId && lot2.todoId === lot.todoId
          )
      );
      await this.tx.labelOnTodo.deleteMany({
        where: {
          AND: [
            {
              todoId: todo.id,
            },
            {
              labelId: {
                in: labelsToRemove?.map((lot) => lot.labelId) ?? [],
              },
            },
          ],
        },
      });

      const labelsToAdd = labelOnTodos?.filter(
        (lot) =>
          !todo.labelOnTodos?.some(
            (lot2) => lot2.labelId === lot.labelId && lot2.todoId === lot.todoId
          )
      );
      for (const label of labelsToAdd ?? []) {
        await this.tx.label.upsert({
          where: {
            name: label.label.name,
          },
          create: {
            id: label.labelId,
            name: label.label.name,
            color: label.label.color,
            labelOnTodo: {
              create: {
                todoId: todo.id,
                id: label.id,
              },
            },
          },
          update: {
            labelOnTodo: {
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

    if (githubSyncEnabled) {
      await octokit.rest.issues.update({
        owner: updatedTodo.GithubIssue?.owner ?? '',
        repo: updatedTodo.GithubIssue?.repo ?? '',
        issue_number: updatedTodo.GithubIssue?.number ?? 0,
        state: 'closed',
      });
    }

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
        labelOnTodos: {
          include: {
            label: true,
          },
        },
        project: true,
      },
    });
  }
}
