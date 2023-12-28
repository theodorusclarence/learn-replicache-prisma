import { Project } from '@prisma/client';
import { Trash } from 'lucide-react';
import React from 'react';
import { useSubscribe } from 'replicache-react';

import { useReplicache } from '@/hooks/useReplicache';
import { useSpace } from '@/hooks/useSpace';

import { IDB_KEY } from '@/models/idb-key.model';
import { TodoDetail } from '@/models/todo.model';
import { ConvertDate } from '@/utils/type-helpers';

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
      <select
        name='project'
        id='project'
        value={project}
        onChange={(e) => {
          setProject(e.target.value);
          rep?.mutate.todoUpdate({
            id: todo.id,
            title: todo.title,
            description: todo.description,
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
    </div>
  );
}
