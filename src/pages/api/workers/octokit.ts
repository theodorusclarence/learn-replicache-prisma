import { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { verifySignature } from '@upstash/qstash/dist/nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { SpaceService } from '@/lib/server/services/space.service';

import { sendPoke } from '@/pages/api/v3/push';
import { octokit } from '@/utils/server/octokit';
import { prismaClient } from '@/utils/server/prisma';
import { SendOctokitEventRequestBody } from '@/utils/server/qstash';
import { isValidBody } from '@/utils/type-helpers';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (
    !isValidBody<SendOctokitEventRequestBody>(req.body, ['todoId', 'eventId'])
  ) {
    return res.status(402);
  }

  const { todoId, eventId } = req.body;

  const spaceService = new SpaceService(prismaClient);

  // Validate that the event status is still null (un processed)
  const event = await prismaClient.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      todo: {
        include: {
          GithubIssue: true,
          project: true,
          labelOnTodos: {
            include: {
              label: true,
            },
          },
        },
      },
    },
  });

  if (!event) return res.status(404).send({ message: 'Event not found' });

  if (event?.status !== null)
    return res.status(200).send({ message: 'Event already processed' });

  await prismaClient.event.update({
    where: {
      id: eventId,
    },
    data: {
      status: 'PROCESSING',
    },
  });

  const { todo } = event;

  switch (event.type) {
    case 'CREATE_ISSUE': {
      let issue: GetResponseTypeFromEndpointMethod<
        typeof octokit.rest.issues.create
      > | null = null;

      try {
        if (!todo) throw new Error('Todo not found');
        if (todo.GithubIssue) throw new Error('Issue already created');

        issue = await octokit.rest.issues.create({
          owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'rtpa25',
          repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
          title: `${todo.id}/${todo.title}`,
          body: `${todo.description ?? ''}
    Created from learn-replicache-prisma app
    `,
          labels: [
            todo.project?.name
              ? `project: ${todo.project.name}`
              : 'project: none',
          ],
        });

        const spaceNext = await spaceService.incrementVersion(todo.spaceId);
        await prismaClient.todo.update({
          where: {
            id: todoId,
          },
          data: {
            GithubIssue: {
              create: {
                number: issue.data.number,
                owner: issue.data.user?.login ?? '',
                repo: issue.data.repository_url.split('/').pop() ?? '',
                id: issue.data.node_id,
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
      } catch (error) {
        console.error(error);

        //TODO: Add error event to separete error handling qstash topic
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

    case 'SYNC_ISSUE': {
      let issue: GetResponseTypeFromEndpointMethod<
        typeof octokit.rest.issues.update
      > | null = null;

      try {
        if (!todo) throw new Error('Todo not found');

        issue = await octokit.rest.issues.update({
          owner:
            todo.GithubIssue?.owner ??
            process.env.NEXT_PUBLIC_GITHUB_OWNER ??
            '',
          repo:
            todo.GithubIssue?.repo ?? process.env.NEXT_PUBLIC_GITHUB_REPO ?? '',
          issue_number: todo.GithubIssue?.number ?? 0,
          body: `${todo.description ?? ''}
        Updated from learn-replicache-prisma app
        `,
          labels: [
            todo.project?.name
              ? `project: ${todo.project.name}`
              : 'project: none',
            ...todo.labelOnTodos.map((loi) => loi.label.name),
          ],
        });

        await prismaClient.event.update({
          where: { id: eventId },
          data: { status: 'SUCCESS' },
        });
      } catch (error) {
        console.error(error, issue);
        //TODO: Add error event to separete error handling qstash topic
        await prismaClient.event.update({
          where: { id: eventId },
          data: { status: 'FAILED' },
        });
      }
      break;
    }
    default:
      break;
  }

  sendPoke();

  return res.status(200).send({
    message: 'Event processed',
  });
}

export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
