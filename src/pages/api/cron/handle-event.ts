import { NextApiRequest, NextApiResponse } from 'next';

import { octokit } from '@/utils/server/octokit';
import { prismaClient } from '@/utils/server/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const events = await prismaClient.event.findMany({
    orderBy: {
      createdAt: 'asc',
    },
    take: 1,
    include: {
      todo: true,
    },
    where: {
      status: null,
    },
  });

  const event = events[0];

  if (!event) {
    return res.status(200).json({ message: 'ok' });
  }

  await prismaClient.event.update({
    where: {
      id: event.id,
    },
    data: {
      status: 'PROCESSING',
    },
  });

  switch (event.type) {
    case 'CREATE_ISSUE': {
      const { todo } = event;
      try {
        const issue = await octokit.rest.issues.create({
          owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'theodorusclarence',
          repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
          title: todo.title,
          body: `${todo.description ?? ''}
      Created from learn-replicache-prisma app
      `,
        });
        await prismaClient.event.update({
          where: {
            id: event.id,
          },
          data: {
            status: 'SUCCESS',
          },
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
        break;
      } catch (error) {
        console.error(error);
        await prismaClient.event.update({
          where: {
            id: event.id,
          },
          data: {
            status: 'FAILED',
          },
        });
      }
    }
  }

  return res.status(200).json({ message: 'Hello World' });
}
