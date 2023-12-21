import { Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useSubscribe } from 'replicache-react';

import { useReplicache } from '@/hooks/useReplicache';
import { useSpace, useSpaceStore } from '@/hooks/useSpace';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

import { TodoWithoutDate } from '@/models/todo.model';

export default function HomePage() {
  const rep = useReplicache();
  const spaceId = useSpace();

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

  const setSpace = useSpaceStore((state) => state.setSpaceId);

  return (
    <Layout>
      <Seo templateTitle='Home' />

      <main>
        <section className=''>
          <div className='layout min-h-screen py-20'>
            <pre className='overflow-x-auto text-xs'>
              {JSON.stringify(spaceId, null, 2)}
            </pre>
            <Button
              onClick={() => {
                if (spaceId === 'dummy-space-id') {
                  setSpace('dummy-space-id-2');
                } else {
                  setSpace('dummy-space-id');
                }
              }}
            >
              Change Space
            </Button>

            <form
              onSubmit={onSubmit}
              className='mt-8 flex flex-col items-start space-y-2'
            >
              <label htmlFor='content'>Title</label>
              <input
                name='content'
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
