import { EmitterWebhookEvent } from '@octokit/webhooks';
import { nanoid } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';

import { prismaClient } from '@/lib/prisma.server';

import { sendPoke } from '@/pages/api/v3/push';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.body.payload === undefined) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  const payload = JSON.parse(
    req.body.payload
  ) as EmitterWebhookEvent<'issues'>['payload'];

  if (!(payload.action === 'opened' || payload.action === 'closed'))
    return res.status(404).json({ status: 'error', message: 'Not found' });

  const space = await prismaClient.space.findFirst({
    where: {
      id: 'dummy-space-id',
    },
  });

  if (!space) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Space not found' });
  }

  const version = space.version;
  const nextVersion = version + 1;

  if (payload.action === 'opened') {
    const { issue, repository } = payload;

    // TODO: Decide if we should check if issue already exist (from todo auto create issue)
    // for now it's fine since error from create is catched and it will be ignored.

    try {
      await prismaClient.todo.create({
        data: {
          id: nanoid(),
          title: issue.title,
          description: issue.body,
          version: nextVersion,
          spaceId: space.id,
          GithubIssue: {
            create: {
              number: issue.number,
              owner: repository.owner.login ?? '',
              repo: repository.name,
              id: issue.node_id,
            },
          },
        },
      });
    } catch (error) {
      console.error('error');
    }
  }

  if (payload.action === 'closed') {
    const { issue } = payload;

    const issueDb = await prismaClient.githubIssue.findUnique({
      where: {
        id: issue.node_id,
      },
    });
    if (!issueDb) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Issue not found' });
    }

    await prismaClient.todo.update({
      where: {
        id: issueDb?.todoId,
      },
      data: {
        isDeleted: true,
        version: nextVersion,
      },
    });
  }

  await prismaClient.space.update({
    where: {
      id: space.id,
    },
    data: {
      version: nextVersion,
    },
  });

  sendPoke();

  return res.status(200).json({ status: 'ok' });
}
