import { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { Message } from 'node-nats-streaming';

import { SpaceService } from '@/lib/server/services/space.service';

import { Listener } from '@/events/base-listener';
import { queueGroupName } from '@/events/listeners/queue-group-name';
import { Subjects } from '@/events/subjects';
import { TaskCreatedEvent } from '@/events/types/task-created-event';
import { sendPoke } from '@/pages/api/v3/push';
import { octokit } from '@/utils/server/octokit';
import { prismaClient } from '@/utils/server/prisma';

export class TaskCreatedEventListener extends Listener<TaskCreatedEvent> {
  readonly subject = Subjects.TaskCreated;
  queueGroupName = queueGroupName;
  async onMessage(data: TaskCreatedEvent['data'], msg: Message): Promise<void> {
    const { eventId, todoId } = data;

    let issue: GetResponseTypeFromEndpointMethod<
      typeof octokit.rest.issues.create
    > | null = null;

    try {
      // Validate that the event status is still null (un processed)
      const event = await prismaClient.event.findUnique({
        where: { id: eventId },
      });
      if (event?.status !== null)
        return console.error('Event already processed');

      await prismaClient.event.update({
        where: { id: eventId },
        data: { status: 'PROCESSING' },
      });

      const todo = await prismaClient.todo.findUnique({
        where: { id: todoId },
        include: { GithubIssue: true, project: true },
      });
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

      const spaceNext = await new SpaceService(prismaClient).incrementVersion(
        todo.spaceId
      );
      await prismaClient.todo.update({
        where: { id: todoId },
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
        where: { id: eventId },
        data: { status: 'SUCCESS' },
      });

      sendPoke();
    } catch (error) {
      console.error(error);

      await prismaClient.event.update({
        where: { id: eventId },
        data: { status: 'FAILED' },
      });
    }

    msg.ack();
  }
}
