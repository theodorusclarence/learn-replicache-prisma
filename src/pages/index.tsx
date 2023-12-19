import { UserButton } from '@clerk/nextjs';
import { nanoid } from 'nanoid';
import pusherJs from 'pusher-js';
import * as React from 'react';
import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import { useSubscribe } from 'replicache-react';

import { M, mutators } from '@/lib/replicache/mutators';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

import { TodoWithoutDate } from '@/types/todo';

const spaceId = 'clqc58guc000ni7aljs6sbyq2';

export default function HomePage() {
  //#region  //*=========== useReplicache Hooks ===========
  const [rep, setRep] = React.useState<Replicache<M> | null>(null);

  React.useEffect(() => {
    (async () => {
      if (rep) return;

      const r = new Replicache({
        name: 'chat-user-id',
        licenseKey: TEST_LICENSE_KEY,
        pushURL: `/api/v3/push?spaceId=${spaceId}`,
        pullURL: `/api/v3/pull?spaceId=${spaceId}`,
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
  const todos = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<TodoWithoutDate>({ prefix: `${spaceId}/todo/` })
        .entries()
        .toArray();
      return list;
    },
    { default: [] }
  );

  const contentRef = React.useRef<HTMLInputElement>(null);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    rep?.mutate.todoCreate({
      id: nanoid(),
      spaceId,
      title: contentRef.current?.value ?? '',
      description: null,
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
              <input
                ref={contentRef}
                value={`todo ${Math.random()}`}
                required
              />
              <Button type='submit'>Submit</Button>
            </form>
            <div className='mt-8 space-y-2'>
              {todos.map(([k, v]) => {
                return <div key={k}>{v.title}</div>;
              })}
            </div>
            <pre className='overflow-x-auto text-xs'>
              {JSON.stringify(todos, null, 2)}
            </pre>
          </div>
        </section>
      </main>
    </Layout>
  );
}
