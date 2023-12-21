import { TodoService } from '@/lib/server/services';

import { Mutators } from '@/models/mutator.model';
import { TodoCreateArgs, TodoDeleteArgs } from '@/models/todo.model';
import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class ServerTodoMutators extends Mutators {
  private todoService: TodoService;
  constructor(private tx: TransactionalPrismaClient) {
    super();
    this.todoService = new TodoService(this.tx);
  }

  public async todoCreate(
    _tx = undefined,
    args: TodoCreateArgs,
    version: number
  ): Promise<void> {
    await this.todoService.create(args, version);
  }
  public async todoDelete(
    _tx = undefined,
    args: TodoDeleteArgs,
    version: number
  ): Promise<void> {
    await this.todoService.delete(args, version);
  }
}
