import { Message, Stan } from 'node-nats-streaming';

import { Subjects } from './subjects';

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class Listener<T extends Event> {
  abstract subject: T['subject']; //abstract properties need to defined by the subclass
  abstract queueGroupName: string;
  abstract onMessage(data: T['data'], msg: Message): void;
  protected client: Stan;
  protected ackWait = 5 * 1000; // protected properties can be only accessed by the subclasses and can be changed by the subclasses if they want to

  constructor(client: Stan) {
    this.client = client;
  }

  subscriptionOptions() {
    return this.client
      .subscriptionOptions()
      .setManualAckMode(true)
      .setAckWait(this.ackWait)
      .setDeliverAllAvailable()
      .setDurableName(this.queueGroupName);
  }

  listen() {
    const subscription = this.client.subscribe(
      this.subject,
      this.queueGroupName,
      this.subscriptionOptions()
    );

    subscription.on('message', (msg: Message) => {
      console.log(`Message received: ${this.subject} / ${this.queueGroupName}`);

      const parsedData = this.parseMessage(msg);
      this.onMessage(parsedData, msg);
    });
  }

  parseMessage(msg: Message) {
    const data = msg.getData();
    return typeof data === 'string'
      ? JSON.parse(data)
      : JSON.parse(data.toString('utf8'));
  }
}
