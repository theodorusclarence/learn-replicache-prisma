import { WriteTransaction } from 'replicache';

import { CreateMessageArgs } from '@/types/message';

export const mutators = {
  async createMessage(
    tx: WriteTransaction,
    { id, from, content, order }: CreateMessageArgs
  ) {
    await tx.set(`clarence/message/${id}`, {
      from,
      content,
      order,
    });
  },
};

export type M = typeof mutators;
