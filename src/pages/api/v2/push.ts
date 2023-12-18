import { Message, Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';

import { prismaClient } from '@/lib/prisma.server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info('\nPush: ***', req.body, '***\n');

  // Provided by Replicache
  const { clientGroupID, mutations } = req.body;

  // Provided by client
  const { realmId } = req.query as { realmId: string };

  // if (!clientID || !realmId || cookie === undefined)
  //   return res.status(403).json({ error: 'insufficient_args' });

  try {
    const trxResponse = await prismaClient?.$transaction(
      async (tx) => {
        //#region  //*=========== Get Next Version ===========
        const _version = await tx.realm.findFirst({
          where: { id: realmId },
          select: { version: true },
        });
        const version = _version?.version ?? 0;

        const nextVersion = version + 1;
        //#endregion  //*======== Get Next Version ===========

        //#region  //*=========== Save New Version to Realm ===========
        const _updatedVersion = await tx.realm.update({
          where: { id: realmId },
          data: { version: nextVersion },
          select: { version: true },
        });
        const updatedVersion = _updatedVersion?.version ?? 0;
        //#endregion  //*======== Save New Version to Realm ===========

        //#region  //*=========== Get Last Client Mutation Id ===========
        const _lastMutationId = await tx.replicacheClient.findUnique({
          where: { id: clientGroupID },
          select: { lastMutationId: true },
        });
        const clientMutationId = _lastMutationId?.lastMutationId ?? 0;
        //#endregion  //*======== Get Last Client Mutation Id ===========

        //#region  //*=========== Get Mutations ===========
        let nextMutationId = clientMutationId;
        for await (const mutation of mutations) {
          // Skip mutations that have already been applied
          if (mutation.id < nextMutationId + 1) continue;
          // Skip mutations that are from the future
          if (mutation.id > nextMutationId + 1) break;

          try {
            console.info(
              '### Applying mutation:',
              nextMutationId + 1,
              JSON.stringify(mutation)
            );

            switch (mutation.name) {
              case 'createMessage': {
                const args = mutation.args as Pick<
                  Message,
                  'from' | 'content' | 'order' | 'id'
                >;

                // TODO: simple error check if ID exists

                try {
                  await tx.message.create({
                    data: { ...args, realm: { connect: { id: realmId } } },
                  });

                  // Only increment if successful
                  nextMutationId += 1;
                } catch (error) {
                  console.error(error);
                }
              }
            }
          } catch (error) {
            console.error(error);
          }
        }
        //#endregion  //*======== Get Mutations ===========

        //#region  //*=========== Save Mutation Id To Client ===========
        await tx.replicacheClient.update({
          where: { id: clientGroupID },
          data: { lastMutationId: nextMutationId },
        });
        //#endregion  //*======== Save Mutation Id To Client ===========

        return { latestVersion: updatedVersion };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      }
    );

    sendPoke();

    return res.status(200).json(trxResponse);
  } catch (error) {
    console.error(error);

    return res.status(401).json({ error: error });
  }
}

async function sendPoke() {
  const pusher = new Pusher({
    appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID as string,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY as string,
    secret: process.env.NEXT_PUBLIC_PUSHER_SECRET as string,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
    useTLS: true,
  });
  const t0 = Date.now();
  await pusher.trigger('default', 'poke', {});
  console.info('Sent poke in', Date.now() - t0);
}
