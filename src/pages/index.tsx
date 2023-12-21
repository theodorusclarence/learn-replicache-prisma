import { Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import pusherJs from 'pusher-js';
import * as React from 'react';
import { Replicache } from 'replicache';
import { useSubscribe } from 'replicache-react';

import { M, mutators } from '@/lib/replicache/mutators';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

import { TodoWithoutDate } from '@/types/todo';

const spaceId = 'dummy-space-id';

export default function HomePage() {
  //#region  //*=========== useReplicache Hooks ===========
  const [rep, setRep] = React.useState<Replicache<M> | null>(null);

  React.useEffect(() => {
    const iid = nanoid();

    const r = new Replicache({
      name: 'chat-user-id',
      licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_KEY as string,
      pushURL: `/api/v3/push?spaceId=${spaceId}&instance=${iid}`,
      pullURL: `/api/v3/pull?spaceId=${spaceId}&instance=${iid}`,
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

    return () => {
      void r.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //#endregion  //*======== useReplicache Hooks ===========
  const todos = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<TodoWithoutDate>({ prefix: `${spaceId}/todo/` })
        .entries()
        .toArray();
      // sort by title using localeCompare
      list.sort((a, b) =>
        a[1].title.localeCompare(b[1].title, undefined, {
          numeric: true,
        })
      );
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
          <div className='layout min-h-screen py-20'>
            Name
            <form
              onSubmit={onSubmit}
              className='flex flex-col items-start space-y-2'
            >
              <input
                ref={contentRef}
                value={`todo ${(todos.length + 1).toString().padStart(2, '0')}`}
                required
              />
              <Button type='submit'>Submit</Button>
            </form>
            <div className='mt-8 space-y-2'>
              {todos.map(([idbKey, todo]) => (
                <div key={idbKey} className='space-x-4'>
                  <button
                    onClick={() => {
                      rep?.mutate.todoDelete({
                        id: todo.id,
                        spaceId,
                      });
                    }}
                  >
                    <Trash size={15} />
                  </button>
                  <span>{todo.title}</span>
                  <span>{idbKey}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
