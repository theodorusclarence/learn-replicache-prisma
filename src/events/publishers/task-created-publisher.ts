import { Publisher } from '@/events/base-publisher';
import { Subjects } from '@/events/subjects';
import { TaskCreatedEvent } from '@/events/types/task-created-event';

export class TaskCreatedPublisher extends Publisher<TaskCreatedEvent> {
  readonly subject = Subjects.TaskCreated;
}
