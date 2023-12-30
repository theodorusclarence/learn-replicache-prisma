import { EmitterWebhookEvent } from '@octokit/webhooks';
import { nanoid } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';

import { sendPoke } from '@/pages/api/v3/push';
import { prismaClient } from '@/utils/server/prisma';

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

  if (
    !(
      payload.action === 'opened' ||
      payload.action === 'closed' ||
      payload.action === 'labeled' ||
      payload.action === 'unlabeled'
    )
  )
    return res.status(404).json({ status: 'error', message: 'Not found' });

  const space = await prismaClient.space.findFirst({
    where: {
      id: 'dummy-space-id-01',
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

  if (payload.action === 'labeled' || payload.action === 'unlabeled') {
    const { issue } = payload;

    const todo = await prismaClient.todo.findFirst({
      where: {
        GithubIssue: {
          id: issue.node_id,
        },
      },
      include: {
        labelOnTodos: {
          include: {
            label: true,
          },
        },
      },
    });

    if (!todo) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Todo not found' });
    }

    const labels = issue.labels?.filter(
      (label) => !label.name.startsWith('project:')
    );

    const labelsToRemove = todo.labelOnTodos.filter(
      (lot) => !labels?.find((label) => lot.label.name === label.name)
    );
    await prismaClient.labelOnTodo.deleteMany({
      where: {
        AND: [
          {
            todoId: todo.id,
          },
          {
            labelId: {
              in: labelsToRemove.map((lot) => lot.labelId),
            },
          },
        ],
      },
    });

    const labelsToAdd = labels?.filter(
      (label) => !todo.labelOnTodos.find((lot) => lot.label.name === label.name)
    );
    for (const label of labelsToAdd ?? []) {
      await prismaClient.label.upsert({
        where: {
          name: label.name,
        },
        create: {
          id: nanoid(),
          name: label.name,
          color: label.color,
          labelOnTodo: {
            create: {
              todoId: todo.id,
              id: nanoid(),
            },
          },
        },
        update: {
          labelOnTodo: {
            create: {
              todoId: todo.id,
              id: nanoid(),
            },
          },
        },
      });
    }

    await prismaClient.todo.update({
      where: {
        id: todo.id,
      },
      data: {
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
