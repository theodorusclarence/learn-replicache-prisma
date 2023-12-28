import { Project } from '@prisma/client';
import { Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import React from 'react';
import Select from 'react-select';
import { DeepReadonlyObject } from 'replicache';
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
  todo: DeepReadonlyObject<ConvertDate<TodoDetail>>;
  idbKey: string;
}) {
  const rep = useReplicache();
  const spaceId = useSpace();
  const project = todo.projectId ?? '';

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

  //#region  //*=========== Tags ===========
  const tagsOptions = [
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
  const [tags, setTags] = React.useState<{ label: string; value: string }[]>(
    []
  );
  React.useEffect(() => {
    setTags(
      todo.tags?.map((tag) => ({ label: tag.name, value: tag.name })) ?? []
    );
  }, [todo.tags]);
  //#endregion  //*======== Tags ===========

  return (
    <div key={idbKey} className='flex items-center gap-4'>
      <button
        onClick={() => {
          rep?.mutate.todoDelete({
            id: todo.id,
          });
        }}
      >
        <Trash size={15} />
      </button>
      <div>
        <div className='space-x-4'>
          <span className='font-mono text-sm text-gray-600'>{todo.id}</span>
          <span>{todo.title}</span>
          <span className='text-green-600'>#{todo.GithubIssue?.number}</span>
          <select
            name='project'
            id='project'
            value={project}
            onChange={(e) => {
              rep?.mutate.todoUpdate({
                id: todo.id,
                title: todo.title,
                description: todo.description,
                projectId: e.target.value === '' ? null : e.target.value,
              });
            }}
          >
            <option value=''>None</option>
            {projects.map(([idbKey, project]) => (
              <option
                key={idbKey}
                value={project.id}
                className='text-orange-400'
              >
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <Select
          className='mt-1'
          isMulti
          closeMenuOnSelect={false}
          options={tagsOptions}
          value={tags}
          onChange={(selected) => setTags(Array.from(selected ?? []))}
          onMenuClose={() => {
            const tagsToSend = tags.map((tag) => {
              const existingTag = todo.tags.find((t) => t.name === tag.value);
              return existingTag
                ? existingTag
                : {
                    id: nanoid(),
                    name: tag.value,
                    todoId: todo.id,
                  };
            });

            rep?.mutate.todoUpdate({
              id: todo.id,
              tags: tagsToSend,
            });
          }}
        />
      </div>
    </div>
  );
}
