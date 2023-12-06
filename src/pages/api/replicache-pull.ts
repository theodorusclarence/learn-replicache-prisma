import { NextApiRequest, NextApiResponse } from 'next';
import { ITask } from 'pg-promise';
import { PatchOperation, PullResponse } from 'replicache';

import { serverID, tx } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const pull = req.body;
  console.info(`Processing pull`, JSON.stringify(pull));
  const { clientGroupID } = pull;
  const fromVersion = pull.cookie ?? 0;
  const t0 = Date.now();

  try {
    // Read all data in a single transaction so it's consistent.
    await tx(async (t) => {
      // Get current version.
      const { version: currentVersion } = await t.one<{ version: number }>(
        'select version from replicache_server where id = $1',
        serverID
      );

      if (fromVersion > currentVersion) {
        throw new Error(
          `fromVersion ${fromVersion} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`
        );
      }

      // Get lmids for requesting client groups.
      const lastMutationIDChanges = await getLastMutationIDChanges(
        t,
        clientGroupID,
        fromVersion
      );

      // Get changed domain objects since requested version.
      const changed = await t.manyOrNone<{
        id: string;
        sender: string;
        content: string;
        ord: number;
        version: number;
        deleted: boolean;
      }>(
        'select id, sender, content, ord, version, deleted from message where version > $1',
        fromVersion
      );

      // Build and return response.
      const patch = [];
      for (const row of changed) {
        const { id, sender, content, ord, version: rowVersion, deleted } = row;
        if (deleted) {
          if (rowVersion > fromVersion) {
            patch.push({
              op: 'del',
              key: `message/${id}`,
            });
          }
        } else {
          patch.push({
            op: 'put',
            key: `message/${id}`,
            value: {
              from: sender,
              content: content,
              order: ord,
            },
          });
        }
      }

      const body: PullResponse = {
        lastMutationIDChanges: lastMutationIDChanges ?? {},
        cookie: currentVersion,
        patch: patch as PatchOperation[],
      };
      res.json(body);
      res.end();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e.toString());
  } finally {
    console.info('Processed pull in', Date.now() - t0);
  }
}

async function getLastMutationIDChanges(
  t: ITask<object>,
  clientGroupID: string,
  fromVersion: number
) {
  const rows = await t.manyOrNone<{ id: string; last_mutation_id: number }>(
    `select id, last_mutation_id
    from replicache_client
    where client_group_id = $1 and version > $2`,
    [clientGroupID, fromVersion]
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.last_mutation_id]));
}
