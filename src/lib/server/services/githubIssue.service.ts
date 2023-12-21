import { TransactionalPrismaClient } from '@/utils/server/prisma';

export class GithubIssue {
  constructor(private tx: TransactionalPrismaClient) {}
}
