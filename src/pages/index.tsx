import { Project } from '@prisma/client';
import { Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useSubscribe } from 'replicache-react';

import { useReplicache } from '@/hooks/useReplicache';
import { useSpace, useSpaceStore } from '@/hooks/useSpace';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

import { TodoDetail } from '@/models/todo.model';
import { ConvertDate } from '@/utils/type-helpers';

export default function HomePage() {
  const rep = useReplicache();
  const spaceId = useSpace();
  const [chosenProject, setChosenProject] = React.useState<string>();
  const todos = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<ConvertDate<TodoDetail>>({ prefix: `${spaceId}/todo/` })
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

  const projects = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<ConvertDate<Project>>({ prefix: `${spaceId}/project/` })
        .entries()
        .toArray();

      // sort by title using localeCompare
      list.sort((a, b) =>
        a[1].name.localeCompare(b[1].name, undefined, {
          numeric: true,
        })
      );
      return list;
    },
    { default: [] }
  );

  const contentRefTodo = React.useRef<HTMLInputElement>(null);
  const contentRefProject = React.useRef<HTMLInputElement>(null);

  const onSubmitTodo: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    rep?.mutate.todoCreate({
      id: nanoid(),
      title: contentRefTodo.current?.value ?? '',
      description: null,
      projectId: chosenProject ?? null,
    });

    if (contentRefTodo.current) contentRefTodo.current.value = '';
  };

  const onSubmitProject: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    rep?.mutate.projectCreate({
      id: nanoid(),
      name: contentRefProject.current?.value ?? '',
    });

    if (contentRefProject.current) contentRefProject.current.value = '';
  };

  const setSpace = useSpaceStore((state) => state.setSpaceId);

  return (
    <Layout>
      <Seo templateTitle='Home' />

      <main>
        <section className='flex'>
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
              onSubmit={onSubmitTodo}
              className='mt-8 flex flex-col items-start space-y-2'
            >
              <div className='flex'>
                <div className='flex flex-col'>
                  <label htmlFor='content'>Title</label>
                  <input
                    readOnly
                    name='content'
                    ref={contentRefTodo}
                    value={`todo ${(todos.length + 1)
                      .toString()
                      .padStart(2, '0')}`}
                    required
                  />
                </div>
                <div className='flex flex-col'>
                  <label htmlFor='project dropdown'>Project</label>
                  <select
                    name='project'
                    id='project'
                    value={chosenProject}
                    defaultValue={projects[0]?.[1]?.id ?? ''}
                    onChange={(e) => setChosenProject(e.target.value)}
                  >
                    {projects.map(([idbKey, project]) => (
                      <option key={idbKey} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type='submit'>Submit</Button>
            </form>
            <div className='mt-8 space-y-2'>
              {todos.map(([idbKey, todo]) => (
                <div key={idbKey} className='space-x-4'>
                  <button
                    onClick={() => {
                      rep?.mutate.todoDelete({
                        id: todo.id,
                      });
                    }}
                  >
                    <Trash size={15} />
                  </button>
                  <span>{todo.title}</span>
                  <span className='text-orange-400'>{todo.project?.name}</span>
                  <span className='text-green-600'>
                    #{todo.GithubIssue?.number}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className='flex flex-col'>
            <form
              onSubmit={onSubmitProject}
              className='mt-8 flex flex-col items-start space-y-2'
            >
              <label htmlFor='content'>Project Name</label>
              <input
                readOnly
                name='content'
                ref={contentRefProject}
                value={`project ${(projects.length + 1)
                  .toString()
                  .padStart(2, '0')}`}
                required
              />
              <Button type='submit'>Submit</Button>
            </form>
            <div className='mt-8 space-y-2'>
              {projects.map(([idbKey, project]) => (
                <div key={idbKey} className='space-x-4'>
                  <button
                    onClick={() => {
                      rep?.mutate.projectDelete({
                        id: project.id,
                      });
                    }}
                  >
                    <Trash size={15} />
                  </button>
                  <span>{project.name}</span>
                  <span className='text-green-600'>#{project.version}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
