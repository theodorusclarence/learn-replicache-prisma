import { WriteTransaction } from 'replicache';

import { MessageWithID } from '@/types/message';

export const mutators = {
  async createMessage(
    tx: WriteTransaction,
    { id, from, content, order }: MessageWithID
  ) {
    await tx.set(`message/${id}`, {
      from,
      content,
      order,
    });
  },
};
