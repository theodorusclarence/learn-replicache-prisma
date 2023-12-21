import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { prismaClient } from '@/lib/prisma.server';

const pullRequestSchema = z.object({
  profileID: z.string(),
  clientGroupID: z.string(),
  cookie: z.number().nullable(),
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

        //#region  //*=========== Create Client Group if not existent ===========
        await tx.clientGroup.upsert({
          where: {
            id: pull.clientGroupID,
          },
          update: {},
          create: {
            id: pull.clientGroupID,
          },
          select: {
            lastPullId: true,
          },
        });
        //#endregion  //*======== Create Client Group if not existent ===========

        //#region  //*=========== Get Client's Last Mutation Ids Since Version ===========
        const clients = await tx.client.findMany({
          where: {
            clientGroupId: pull.clientGroupID,
            version: { gt: cookie ?? 0 },
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
            version: { gt: cookie ?? 0 },
          },
        });

        const responseCookie: Cookie = version;

        return { todos, lastMutationIds, responseCookie };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
        maxWait: 5000, // default: 2000
        timeout: 20000, // default: 5000
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
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error)
      return res.status(500).json({ error: error.message });

    return res.status(500).json({ error: error });
  }
}
