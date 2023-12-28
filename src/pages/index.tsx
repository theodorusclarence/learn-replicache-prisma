import { Project } from '@prisma/client';
import { Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import * as React from 'react';
import CreatableSelect from 'react-select/creatable';
import { useSubscribe } from 'replicache-react';

import { useReplicache } from '@/hooks/useReplicache';
import { useSpace, useSpaceStore } from '@/hooks/useSpace';

import Button from '@/components/buttons/Button';
import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

import { IDB_KEY } from '@/models/idb-key.model';
import { TodoDetail } from '@/models/todo.model';
import { ConvertDate } from '@/utils/type-helpers';

export default function HomePage() {
  const rep = useReplicache();
  const spaceId = useSpace();

  const todos = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<ConvertDate<TodoDetail>>({ prefix: IDB_KEY.TODO({ spaceId }) })
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
        .scan<ConvertDate<Project>>({ prefix: IDB_KEY.PROJECT({ spaceId }) })
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
  const projectSelectRef = React.useRef<HTMLSelectElement>(null);

  const onSubmitTodo: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    rep?.mutate.todoCreate({
      id: nanoid(),
      title: contentRefTodo.current?.value ?? '',
      description: null,
      projectId: projectSelectRef.current?.value ?? null,
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
        <section>
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
            <div className='mt-8 flex flex-col gap-8 md:flex-row md:justify-between'>
              <div>
                <form
                  onSubmit={onSubmitTodo}
                  className='flex flex-col items-start space-y-2'
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
                      <label htmlFor='project'>Project</label>
                      <select
                        name='project'
                        id='project'
                        ref={projectSelectRef}
                        defaultValue={projects[0]?.[1]?.id ?? ''}
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
                <div className='mt-8 space-y-4'>
                  {todos.map(([idbKey, todo]) => (
                    <TodoRow
                      key={idbKey}
                      todo={todo as ConvertDate<TodoDetail>}
                      idbKey={idbKey}
                    />
                  ))}
                </div>
              </div>
              <div className='flex flex-col'>
                <form
                  onSubmit={onSubmitProject}
                  className='flex flex-col items-start space-y-2'
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
                        onClick={() =>
                          rep?.mutate.projectDelete({ id: project.id })
                        }
                      >
                        <Trash size={15} />
                      </button>
                      <span>{project.name}</span>
                      <span className='text-green-600'>
                        ver: {project.version}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

export function TodoRow({
  todo,
  idbKey,
}: {
  todo: ConvertDate<TodoDetail>;
  idbKey: string;
}) {
  const rep = useReplicache();
  const spaceId = useSpace();
  const [project, setProject] = React.useState(todo.projectId ?? '');
  const [chosenLables, setChosenLables] = React.useState<
    { label: string; value: string }[]
  >([]);

  React.useEffect(() => {
    setChosenLables(
      (todo.labelOnIssues ?? []).map((l) => ({
        label: l.label.name.toLowerCase(),
        value: l.label.name.toLowerCase(),
      }))
    );
  }, [todo.labelOnIssues]);

  const labels = [
    { label: 'bug', value: 'bug' },
    { label: 'feature', value: 'feature' },
    { label: 'enhancement', value: 'enhancement' },
    { label: 'documentation', value: 'documentation' },
    { label: 'help wanted', value: 'help wanted' },
    { label: 'good first issue', value: 'good first issue' },
    { label: 'invalid', value: 'invalid' },
    { label: 'question', value: 'question' },
    { label: 'wontfix', value: 'wontfix' },
  ];

  const projects = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx
        .scan<ConvertDate<Project>>({ prefix: IDB_KEY.PROJECT({ spaceId }) })
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
  return (
    <div key={idbKey} className='flex items-center space-x-4'>
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
      <select
        name='project'
        id='project'
        value={project}
        onChange={(e) => {
          setProject(e.target.value);
          rep?.mutate.todoUpdate({
            id: todo.id,
            projectId: e.target.value ?? null,
          });
        }}
      >
        <option value=''>None</option>
        {projects.map(([idbKey, project]) => (
          <option key={idbKey} value={project.id} className='text-orange-400'>
            {project.name}
          </option>
        ))}
      </select>
      <span className='text-green-600'>#{todo.GithubIssue?.number}</span>
      <CreatableSelect
        isMulti
        options={labels}
        value={chosenLables}
        onChange={(selected) => {
          setChosenLables(Array.from(selected ?? []));
        }}
        closeMenuOnSelect={false}
        onMenuClose={() => {
          rep?.mutate.todoUpdate({
            id: todo.id,
            labelOnIssues: chosenLables.map((l) => {
              // check is label exist
              const existingLabel = todo.labelOnIssues?.find(
                (loi) => loi.label.name.toLowerCase() === l.value
              );
              if (existingLabel) {
                return existingLabel;
              } else {
                const labelId = nanoid();
                return {
                  id: nanoid(),
                  label: {
                    id: labelId,
                    name: l.value,
                    color: '#000000',
                  },
                  labelId,
                  todoId: todo.id,
                };
              }
            }),
          });
        }}
      />
    </div>
  );
}
