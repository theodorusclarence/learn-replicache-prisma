import { nanoid } from 'nanoid';
import pusherJs from 'pusher-js';
import * as React from 'react';
import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import { useSubscribe } from 'replicache-react';

import { mutators } from '@/lib/replicache/mutators';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

import { Message } from '@/types/message';

const rep =
  typeof window !== 'undefined'
    ? new Replicache({
        name: 'chat-user-id',
        licenseKey: TEST_LICENSE_KEY,
        pushURL: '/api/replicache-push',
        pullURL: '/api/replicache-pull',
        mutators: mutators,
      })
    : null;

function listen() {
  if (!rep) {
    return;
  }

  console.info('listening');
  // Listen for pokes, and pull whenever we get one.
  pusherJs.logToConsole = true;
  const pusher = new pusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
  });
  const channel = pusher.subscribe('default');
  channel.bind('poke', () => {
    console.info('got poked');
    rep.pull();
  });
}
listen();

export default function HomePage() {
  const messages = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<Message>({ prefix: 'message/' })
        .entries()
        .toArray();
      list.sort(([, { order: a }], [, { order: b }]) => a - b);
      return list;
    },
    { default: [] }
  );

  const usernameRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLInputElement>(null);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const last = (messages.length > 0 && messages[messages.length - 1][1]) || {
      order: 0,
    };
    const order = (last?.order ?? 0) + 1;

    rep?.mutate.createMessage({
      id: nanoid(),
      from: usernameRef.current?.value ?? '',
      content: contentRef.current?.value ?? '',
      order,
    });

    if (contentRef.current) contentRef.current.value = '';
  };

  return (
    <Layout>
      <Seo templateTitle='Home' />

      <main>
        <section className=''>
          <div className='layout min-h-screen py-20'>
            Name
            <form
              onSubmit={onSubmit}
              className='flex flex-col items-start space-y-2'
            >
              <input ref={usernameRef} required /> says:{' '}
              <input ref={contentRef} required />
              <Button type='submit'>Submit</Button>
            </form>
            <div className='mt-8 space-y-2'>
              {messages.map(([k, v]) => {
                return (
                  <div key={k}>
                    <b>{v.from}: </b>
                    {v.content}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
