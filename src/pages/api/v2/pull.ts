import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { prismaClient } from '@/lib/prisma.server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info('\nPull: ***', req.body, '***\n');

  // Provided by Replicache
  const { clientGroupID, cookie } = req.body as {
    clientGroupID: string;
    cookie: number | null;
  };
  const fromVersion = cookie ?? 0;

  // Provided by client
  const { realmId } = req.query as { realmId: string };

  // if (!clientID || !realmId || cookie === undefined)
  //   return res.status(403).json({ error: 'insufficient_args' });

  try {
    const trxResponse = await prismaClient?.$transaction(
      async (tx) => {
        //#region  //*=========== Get Current Version ===========
        const versionRes = await tx.realm.findFirst({
          where: { id: realmId },
          select: { version: true },
        });
        const currentVersion = versionRes?.version ?? 0;
        if (fromVersion > currentVersion) {
          throw new Error(
            `fromVersion ${fromVersion} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`
          );
        }
        //#endregion  //*======== Get Current Version ===========

        //#region  //*=========== Get Last Mutation Id ===========
        const _lastMutationId = await tx.replicacheClient.findUnique({
          where: { id: clientGroupID },
          select: { lastMutationId: true },
        });
        let lastMutationId = 0;
        if (_lastMutationId) {
          lastMutationId = _lastMutationId.lastMutationId;
        } else {
          await tx.replicacheClient.create({
            data: { id: clientGroupID, lastMutationId: 0 },
          });

          lastMutationId = 0;
        }
        //#endregion  //*======== Get Last Mutation Id ===========

        //#region  //*=========== Get Changed Domain (Transaction Entries) ===========
        const changed = await tx.message.findMany({
          where: { realmId, version: { gt: fromVersion } },
        });

        const patch = [];
        // #4. Put together a patch with instructions for the client
        if (fromVersion === null) patch.push({ op: 'clear' });

        if (changed?.length)
          patch.push(
            ...changed.map((item) => ({
              op: !item.isDeleted ? 'put' : 'del',
              key: `${realmId}/message/${item.id}`,
              value: { ...item },
            }))
          );
        //#endregion  //*======== Get Changed Domain (Transaction Entries) ===========

        return { lastMutationId, patch, version: currentVersion };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      }
    );

    return res.json(trxResponse);
  } catch (error) {
    console.error(error);

    return res.status(401).json({ error: error });
  }
}
