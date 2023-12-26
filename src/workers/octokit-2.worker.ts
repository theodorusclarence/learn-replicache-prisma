import { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { EventType } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { Octokit } from 'octokit';

import { prismaClient } from '@/utils/server/prisma';
import { redis_connection } from '@/utils/server/redis';
import { errorQueue } from '@/workers/error-checker.worker';

const octokit = new Octokit({
  auth: 'random',
});

const WORKER_NAME = 'octokit';

export const octokitQueue = new Queue(WORKER_NAME, {
  connection: redis_connection,
});

const worker = new Worker(
  'WORKER_NAME',
  async (job) => {
    // get the job name -- event type
    const jobName = job.name as EventType;

    // decide which worker needs to run from the above
    switch (jobName) {
      case 'CREATE_ISSUE': {
        let issue: GetResponseTypeFromEndpointMethod<
          typeof octokit.rest.issues.create
        > | null = null;
        const { todoId, eventId } = job.data;

        try {
          // Validate that the event status is still null (un processed)
          const event = await prismaClient.event.findUnique({
            where: { id: eventId },
          });
          if (event?.status !== null)
            return console.error('Event already processed');

          await prismaClient.event.update({
            where: {
              id: eventId,
            },
            data: {
              status: 'PROCESSING',
            },
          });

          const todo = await prismaClient.todo.findUnique({
            where: {
              id: todoId,
            },
            include: {
              GithubIssue: true,
            },
          });
          if (!todo) throw new Error('Todo not found');
          if (todo.GithubIssue) throw new Error('Issue already created');

          //TODO: Failed events should know this is already existing
          issue = await octokit.rest.issues.create({
            owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'rtpa25',
            repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
            title: `${todo.id}/${todo.title}`,
            body: `${todo.description ?? ''}
        Created from learn-replicache-prisma app
        `,
          });

          await prismaClient.githubIssue.create({
            data: {
              number: issue.data.number,
              owner: issue.data.user?.login ?? '',
              repo: issue.data.repository_url.split('/').pop() ?? '',
              id: issue.data.node_id,
              todoId,
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
          console.error(error);
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

        break;
      }
      default:
        break;
    }
    // create issue
    // fetch todoId from job.data

    return 'done';
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
