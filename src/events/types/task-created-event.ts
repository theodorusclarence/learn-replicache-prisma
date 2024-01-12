import { Subjects } from '@/events/subjects';

export interface TaskCreatedEvent {
  subject: Subjects.TaskCreated;
  data: {
    todoId: string;
    eventId: string;
  };
}
