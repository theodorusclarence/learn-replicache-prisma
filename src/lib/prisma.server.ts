// @see https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices
// @see https://github.com/nextauthjs/next-auth/issues/824#issuecomment-860266512
import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prismaClient = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prismaClient;

export type TransactionalPrismaClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];
