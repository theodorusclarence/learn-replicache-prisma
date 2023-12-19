import { UserButton } from '@clerk/nextjs';
import { Todo } from '@prisma/client';
import { nanoid } from 'nanoid';
import pusherJs from 'pusher-js';
import * as React from 'react';
import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import { useSubscribe } from 'replicache-react';

import { M, mutators } from '@/lib/replicache/mutators';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

const realmId = 'clarence';

export default function HomePage() {
  //#region  //*=========== useReplicache Hooks ===========
  const [rep, setRep] = React.useState<Replicache<M> | null>(null);

  React.useEffect(() => {
    (async () => {
      if (rep) return;

      const r = new Replicache({
        name: 'chat-user-id',
        licenseKey: TEST_LICENSE_KEY,
        pushURL: `/api/v2/push?realmId=${realmId}`,
        pullURL: `/api/v2/pull?realmId=${realmId}`,
        mutators: mutators,
      });
      setRep(r);

      if (
        process.env.NEXT_PUBLIC_PUSHER_KEY &&
        process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      ) {
        // Listen for pokes, and pull whenever we get one.
        pusherJs.logToConsole = true;
        const pusher = new pusherJs(
          process.env.NEXT_PUBLIC_PUSHER_KEY as string,
          {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
          }
        );
        const channel = pusher.subscribe('default');
        channel.bind('poke', () => {
          void r.pull();
        });
      }

      return () => void r.close();
    })();
  }, [rep]);

  //#endregion  //*======== useReplicache Hooks ===========
  const messages = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<Todo>({ prefix: 'clarence/message/' })
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
          <header>
            <UserButton afterSignOutUrl='/' />
          </header>
          <div>Your home page's content can go here.</div>
          <div className='layout min-h-screen py-20'>
            Name
            <form
              onSubmit={onSubmit}
              className='flex flex-col items-start space-y-2'
            >
              <input ref={usernameRef} defaultValue='Clarence' required /> says:{' '}
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
