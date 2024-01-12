import { TaskCreatedEventListener } from '@/events/listeners/task-created-event-listener';
import { natsWrapper } from '@/utils/server/nats-wrapper';

const main = async () => {
  // WHERE DOES THIS GO?
  if (!process.env.NATS_CLUSTER_ID) throw new Error('NATS_CLUSTER_ID missing');
  if (!process.env.NATS_CLIENT_ID) throw new Error('NATS_CLIENT_ID missing');
  if (!process.env.NATS_URI) throw new Error('NATS_URI missing');

  await natsWrapper.connect(
    process.env.NATS_CLUSTER_ID,
    process.env.NATS_CLIENT_ID,
    process.env.NATS_URI
  );

  natsWrapper.client.on('close', () => {
    console.log('NATS connection closed!');
    process.exit();
  });

  process.on('SIGINT', () => natsWrapper.client.close());
  process.on('SIGTERM', () => natsWrapper.client.close());

  new TaskCreatedEventListener(natsWrapper.client).listen();
};

main();
