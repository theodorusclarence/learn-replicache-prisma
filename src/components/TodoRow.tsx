import { Project } from '@prisma/client';
import { Trash } from 'lucide-react';
import React, { useMemo } from 'react';
import Select from 'react-select';
import { useSubscribe } from 'replicache-react';

import { useReplicache } from '@/hooks/useReplicache';
import { useSpace } from '@/hooks/useSpace';

import { IDB_KEY } from '@/models/idb-key.model';
import { TodoDetail } from '@/models/todo.model';
import { ConvertDate } from '@/utils/type-helpers';

const TodoRow = ({
  todo,
  idbKey,
}: {
  todo: ConvertDate<TodoDetail>;
  idbKey: string;
}) => {
  const rep = useReplicache();
  const spaceId = useSpace();
  const [project, setProject] = React.useState(todo.projectId ?? '');
  const [selectedLabels, setSelectedLabels] = React.useState<
    { label: string; value: string }[]
  >(
    (todo.GithubIssue?.labels ?? []).map((l) => ({
      label: l.name.toLowerCase(),
      value: l.name.toLowerCase(),
    }))
  );

  const labels = useMemo(() => {
    return [
      ...(todo.GithubIssue?.labels ?? []).map((l) => ({
        label: l.name.toLowerCase(),
        value: l.name.toLowerCase(),
      })),
      { label: 'bug', value: 'bug' },
      { label: 'feature', value: 'feature' },
      { label: 'enhancement', value: 'enhancement' },
      { label: 'documentation', value: 'documentation' },
      { label: 'help wanted', value: 'help wanted' },
      { label: 'good first issue', value: 'good first issue' },
      { label: 'invalid', value: 'invalid' },
      { label: 'question', value: 'question' },
      { label: 'wontfix', value: 'wontfix' },
    ].filter((v, i, a) => a.findIndex((t) => t.value === v.value) === i);
  }, [todo.GithubIssue?.labels]);

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
    <div key={idbKey} className='flex items-center justify-center space-x-4'>
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
      <Select
        isMulti
        closeMenuOnSelect={false}
        className='w-64'
        options={labels}
        value={selectedLabels}
        onChange={(selected) => setSelectedLabels(Array.from(selected ?? []))}
        onMenuClose={() => {
          // rep?.mutate.todoUpdate({
          //   id: todo.id,
          //   title: todo.title,
          //   description: todo.description,
          //   labels: selectedLabels.map((l) => l.value),
          // });
        }}
      />
    </div>
  );
};

export default TodoRow;
