import { Message } from '@prisma/client';

export type MessageWithoutId = Omit<Message, 'id'>;

export type CreateMessageArgs = Pick<
  Message,
  'content' | 'from' | 'order' | 'id'
>;
