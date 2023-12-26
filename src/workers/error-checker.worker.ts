import { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { Queue, Worker } from 'bullmq';

import { SpaceService } from '@/lib/server/services/space.service';

import { sendPoke } from '@/pages/api/v3/push';
import { octokit } from '@/utils/server/octokit';
import { prismaClient } from '@/utils/server/prisma';
import { redis_connection } from '@/utils/server/redis';

const WORKER_NAME = 'errors';

export const errorQueue = new Queue(WORKER_NAME, {
  connection: redis_connection,
});

type JobData = {
  eventId: string;
  issue: GetResponseTypeFromEndpointMethod<
    typeof octokit.rest.issues.create
  > | null;
};

const worker = new Worker(
  WORKER_NAME,
  async (job) => {
    const { eventId, issue } = job.data as JobData;
    const spaceService = new SpaceService(prismaClient);

    try {
      const event = await prismaClient.event.findUnique({
        where: { id: eventId },
        include: {
          todo: true,
        },
      });
      if (!event) throw new Error('Event not found');
      if (event.status === 'PROCESSING')
        throw new Error('Event already being processed');
      if (event.status === 'SUCCESS')
        throw new Error('Event already processed');

      await prismaClient.event.update({
        where: {
          id: eventId,
        },
        data: {
          status: 'PROCESSING',
        },
      });

      const todo = event.todo;

      // already created an issue on github check if the same is existing in our db
      // if not then create one and connect to this todo
      if (issue === null) {
        await prismaClient.event.update({
          where: {
            id: eventId,
          },
          data: {
            status: null,
          },
        });

        return;
      }

      const spaceNext = await spaceService.incrementVersion(todo.spaceId);
      await prismaClient.todo.update({
        where: {
          id: todo.id,
        },
        data: {
          GithubIssue: {
            connectOrCreate: {
              where: {
                id: issue.data.node_id,
              },
              create: {
                number: issue.data.number,
                owner: issue.data.user?.login ?? '',
                repo: issue.data.repository_url.split('/').pop() ?? '',
                id: issue.data.node_id,
              },
            },
          },
          version: spaceNext.version,
        },
      });

      await prismaClient.event.update({
        where: {
          id: eventId,
        },
        data: {
          status: 'SUCCESS',
        },
      });
      sendPoke();
    } catch (error) {
      await errorQueue.add('octokit-failed-jobs', {
        eventId,
        issue,
      });
      await prismaClient.event.update({
        where: {
          id: eventId,
        },
        data: {
          status: 'FAILED',
        },
      });
    }
  },
  {
    connection: redis_connection,
    concurrency: 50,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);

worker.on('completed', (job) => {
  console.info(`Worker:${WORKER_NAME} → ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.info(
    `Worker:${WORKER_NAME} → ${job?.id} has failed with ${err.message}`
  );
});

export default worker;
