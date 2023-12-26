import { Queue, Worker } from 'bullmq';

import { octokit } from '@/utils/server/octokit';
import { prismaClient } from '@/utils/server/prisma';
import { redis_connection } from '@/utils/server/redis';

export const octokitQueue = new Queue('octokit', {
  connection: redis_connection,
});

const worker = new Worker(
  'octokit',
  async (job) => {
    const todoId = job.data.todoId;

    const todo = await prismaClient.todo.findUnique({
      where: {
        id: todoId,
      },
    });

    if (todo === null) {
      return 'todo not found';
    }

    const issue = await octokit.rest.issues.create({
      owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'rtpa25',
      repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
      title: `${todo.id}/${todo.title}`,
      body: `${todo.description ?? ''}
      Created from learn-replicache-prisma app
      `,
    });

    await prismaClient.githubIssue.create({
      data: {
        id: issue.data.node_id,
        number: issue.data.number,
        owner: issue.data.user?.login ?? '',
        repo: issue.data.repository_url.split('/').pop() ?? '',
        todoId: todo.id,
      },
    });

    return 'done';
  },
  {
    connection: redis_connection,
    concurrency: 10,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);

worker.on('completed', (job) => {
  console.info(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.info(`${job?.id} has failed with ${err.message}`);
});

export default worker;
