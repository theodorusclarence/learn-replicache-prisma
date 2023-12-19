import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { prismaClient } from '@/lib/prisma.server';

const pullRequestSchema = z.object({
  profileID: z.string(),
  clientGroupID: z.string(),
  cookie: z
    .object({
      version: z.number(),
      order: z.number(),
    })
    .nullable(),
  schemaVersion: z.string(),
});
type Cookie = z.infer<typeof pullRequestSchema>['cookie'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info(`\nProcessing pull`, JSON.stringify(req.body, null, ''));

  const spaceId = req.query.spaceId as string;
  const pull = pullRequestSchema.parse(req.body);
  const cookie = pull.cookie;

  try {
    //#region  //*=========== Prisma Transaction ===========
    const trxResponse = await prismaClient?.$transaction(
      async (tx) => {
        //#region  //*=========== Get Space's Version ===========
        const _version = await tx.space.findUnique({
          where: {
            id: spaceId,
          },
          select: {
            version: true,
          },
        });
        const version = _version?.version;

        if (version === undefined) {
          return undefined;
        }
        //#endregion  //*======== Get Space's Version ===========

        //#region  //*=========== Increment Client Group's Pull ID ===========
        const _nextPullId = await tx.clientGroup.upsert({
          where: {
            id: pull.clientGroupID,
          },
          update: {
            lastPullId: {
              increment: 1,
            },
          },
          create: {
            id: pull.clientGroupID,
          },
          select: {
            lastPullId: true,
          },
        });
        const nextPullId = _nextPullId?.lastPullId ?? 1;
        //#endregion  //*======== Increment Client Group's Pull ID ===========

        if (!cookie) {
          //#region  //*=========== Get Client's Last Mutation Ids Since 0 ===========
          const clients = await tx.client.findMany({
            where: {
              clientGroupId: pull.clientGroupID,
              version: { gt: 0 },
            },
          });
          /**
           * @example
           * {
           *   "1234132412343": 1,
           *   "1234132412344": 2,
           *  }
           */
          const lastMutationIds = Object.fromEntries(
            clients.map((client) => [client.id, client.lastMutationId])
          );
          //#endregion  //*======== Get Client's Last Mutation Ids Since 0 ===========

          const todos = await tx.todo.findMany({
            where: {
              spaceId,
            },
          });

          const responseCookie: Cookie = {
            version,
            order: nextPullId,
          };

          return { todos, lastMutationIds, responseCookie };
        } else {
          //#region  //*=========== Get Client's Last Mutation Ids Since Version ===========
          const clients = await tx.client.findMany({
            where: {
              clientGroupId: pull.clientGroupID,
              version: { gt: cookie.version },
            },
          });
          /**
           * @example
           * {
           *   "1234132412343": 1,
           *   "1234132412344": 2,
           *  }
           */
          const lastMutationIds = Object.fromEntries(
            clients.map((client) => [client.id, client.lastMutationId])
          );
          //#endregion  //*======== Get Client's Last Mutation Ids Since Version ===========

          const todos = await tx.todo.findMany({
            where: {
              spaceId,
              version: { gt: cookie.version },
            },
          });

          const responseCookie: Cookie = {
            version,
            order: nextPullId,
          };

          return { todos, lastMutationIds, responseCookie };
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      }
    );
    //#endregion  //*======== Prisma Transaction ===========

    if (trxResponse === undefined) {
      return res.status(404).json({
        ok: false,
      });
    }

    const pullResponse = {
      lastMutationIDChanges: trxResponse.lastMutationIds,
      cookie: trxResponse.responseCookie,
      patch: trxResponse.todos.map((todo) => ({
        op: todo.isDeleted ? 'del' : 'put',
        key: `${todo.spaceId}/todo/${todo.id}`,
        value: todo.isDeleted ? undefined : todo,
      })),
    };

    return res.status(200).json(pullResponse);
  } catch (error) {
    console.error(error);
  }
}
