import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';
import { z } from 'zod';

import { prismaClient } from '@/lib/prisma.server';
import { backendMutators } from '@/lib/replicache/backend-mutators.server';

const pushRequestSchema = z.object({
  profileID: z.string(),
  clientGroupID: z.string(),
  mutations: z.array(
    z.object({
      id: z.number(),
      clientID: z.string(),
      name: z.string(),
      args: z.any(),
    })
  ),
  schemaVersion: z.string(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.info(`\nProcessing push`, JSON.stringify(req.body, null, ''));

  const spaceId = req.query.spaceId as string;
  const push = pushRequestSchema.parse(req.body);

  try {
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

        const nextVersion = version + 1;

        //#region  //*=========== Get Last Mutation Ids of Clients in Mutation ===========
        const clientIds = Array.from(
          new Set(push.mutations.map((m) => m.clientID))
        );
        const clients = await tx.client.findMany({
          where: {
            id: {
              in: clientIds,
            },
          },
          select: {
            id: true,
            lastMutationId: true,
          },
        });

        // Create clients that don't exist yet
        const clientsNotFound = clientIds.filter(
          (id) => !clients.some((c) => c.id === id)
        );
        if (clientsNotFound.length > 0) {
          await tx.client.createMany({
            data: clientsNotFound.map((id) => ({
              id,
              version: nextVersion,
              clientGroupId: push.clientGroupID,
            })),
          });
        }

        /**
         * @example
         * {
         *   "1234132412343": 1,
         *   "1234132412344": 2,
         *  }
         */
        const lastMutationIds: Record<string, number> = Object.fromEntries([
          ...clients.map((c) => [c.id, c.lastMutationId]),
          // Recently created clients will have lastMutationId = 0
          ...clientsNotFound.map((id) => [id, 0]),
        ]);
        //#endregion  //*======== Get Last Mutation Ids of Clients in Mutation ===========

        //#region  //*=========== Iterate and Process Mutations ===========
        for await (const mutation of push.mutations) {
          const lastMutationId = lastMutationIds[mutation.clientID];
          if (lastMutationId === undefined) {
            throw new Error(
              'invalid state - lastMutationID not found for client: ' +
                mutation.clientID
            );
          }
          const expectedMutationId = lastMutationId + 1;

          if (mutation.id < expectedMutationId) {
            console.info(
              `Mutation ${mutation.id} from client ${mutation.clientID} was already processed. Skipping.`
            );
            continue;
          }
          if (mutation.id > expectedMutationId) {
            console.info(
              `Mutation ${mutation.id} from client ${mutation.clientID} is from the future. Aborting.`
            );
            break;
          }

          //* Process Mutations
          const mutator =
            backendMutators[mutation.name as keyof typeof backendMutators];
          if (!mutator) {
            throw new Error(`Unknown mutation: ${mutation.name}`);
          }

          try {
            await mutator(tx, mutation.args, nextVersion);
          } catch (error) {
            console.error(error);
            throw new Error(`Error processing mutation: ${mutation.name}`);
          }

          //#region  //*=========== Update Client's Last Mutation Ids ===========
          lastMutationIds[mutation.clientID] = expectedMutationId;
          // Create ClientGroup if it doesn't exist yet
          await tx.clientGroup.upsert({
            where: {
              id: push.clientGroupID,
            },
            update: {},
            create: {
              id: push.clientGroupID,
            },
          });
          // Update Client's lastMutationId
          const promises = Object.entries(lastMutationIds).map(
            ([id, lastMutationId]) => {
              return tx.client.update({
                where: {
                  id,
                },
                data: {
                  lastMutationId,
                },
              });
            }
          );
          await Promise.all(promises);
          //#endregion  //*======== Update Client's Last Mutation Ids ===========

          //#region  //*=========== Update Space's Version ===========
          await tx.space.update({
            where: {
              id: spaceId,
            },
            data: {
              version: nextVersion,
            },
          });
          //#endregion  //*======== Update Space's Version ===========
        }
        //#endregion  //*======== Iterate and Process Mutations ===========

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      }
    );

    if (!trxResponse) {
      return res.status(404).json({
        ok: false,
      });
    }

    sendPoke();

    return res.status(200).json({});
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error)
      return res.status(500).json({ error: error.message });

    return res.status(500).json({ error: error });
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
