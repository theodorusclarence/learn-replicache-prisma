import { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { Queue, Worker } from 'bullmq';
import { Octokit } from 'octokit';

import { prismaClient } from '@/utils/server/prisma';
import { redis_connection } from '@/utils/server/redis';

const WORKER_NAME = 'errors';

const octokit = new Octokit({
  auth: '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',
});

export const errorQueue = new Queue(WORKER_NAME, {
  connection: redis_connection,
});

type JobData = {
  eventId: string;
  issue: GetResponseTypeFromEndpointMethod<
    typeof octokit.rest.issues.create
  > | null;
};

const worker = new Worker(WORKER_NAME, async (job) => {
  const { eventId, issue } = job.data as JobData;

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
    if (event.status === 'SUCCESS') throw new Error('Event already processed');

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

    await prismaClient.githubIssue.upsert({
      where: {
        id: issue.data.node_id,
      },
      update: {},
      create: {
        number: issue.data.number,
        owner: issue.data.user?.login ?? '',
        repo: issue.data.repository_url.split('/').pop() ?? '',
        id: issue.data.node_id,
        todoId: todo.id,
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
});

worker.on('completed', (job) => {
  console.info(`Worker:${WORKER_NAME} → ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.info(
    `Worker:${WORKER_NAME} → ${job?.id} has failed with ${err.message}`
  );
});

export default worker;