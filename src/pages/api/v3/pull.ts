import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { ClientService } from '@/lib/server/services/client.service';
import { ClientGroupService } from '@/lib/server/services/clientGroup.service';
import { ProjectService } from '@/lib/server/services/project.service';
import { SpaceService } from '@/lib/server/services/space.service';
import { TodoService } from '@/lib/server/services/todo.service';

import { prismaClient } from '@/utils/server/prisma';

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
  //TODO[Dimension]: validate spaceId belongs to the current user
  try {
    //#region  //*=========== Prisma Transaction ===========
    const trxResponse = await prismaClient?.$transaction(
      async (tx) => {
        //#region  //*=========== Get Services ===========
        const clientService = new ClientService(tx);
        const spaceService = new SpaceService(tx);
        const clientGroupService = new ClientGroupService(tx);
        const todoService = new TodoService(tx);
        const projectService = new ProjectService(tx);
        //#endregion  //*======== Get Services ===========

        //#region  //*=========== Get Space's Version ===========
        const space = await spaceService.getById(spaceId);
        const version = space?.version;

        if (version === undefined) {
          return undefined;
        }
        //#endregion  //*======== Get Space's Version ===========

        //#region  //*=========== Create Client Group if not existent ===========
        await clientGroupService.createIfNotExists(pull.clientGroupID);
        //#endregion  //*======== Create Client Group if not existent ===========

        //#region  //*=========== Get Client's Last Mutation Ids Since Version ===========
        const clients = await clientService.findManyInClientGroup(
          pull.clientGroupID,
          cookie ?? 0
        );
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

        const todos = await todoService.findManyBySpace(spaceId, cookie ?? 0);
        const projects = await projectService.findManyBySpace(
          spaceId,
          cookie ?? 0
        );
        const responseCookie: Cookie = version;

        return { todos, lastMutationIds, responseCookie, projects };
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
      patch: [
        ...trxResponse.todos.map((todo) => ({
          op: todo.isDeleted ? 'del' : 'put',
          key: `${todo.spaceId}/todo/${todo.id}`,
          value: todo.isDeleted ? undefined : todo,
        })),
        ...trxResponse.projects.map((project) => ({
          op: project.isDeleted ? 'del' : 'put',
          key: `${project.spaceId}/project/${project.id}`,
          value: project.isDeleted ? undefined : project,
        })),
      ],
    };

    return res.status(200).json(pullResponse);
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error)
      return res.status(500).json({ error: error.message });

    return res.status(500).json({ error: error });
  }
}
