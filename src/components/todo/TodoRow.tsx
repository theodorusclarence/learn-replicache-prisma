import { Project } from '@prisma/client';
import { Trash } from 'lucide-react';
import { nanoid } from 'nanoid';
import * as React from 'react';
import CreatableSelect from 'react-select/creatable';
import { DeepReadonlyObject } from 'replicache';
import { useSubscribe } from 'replicache-react';

import { useReplicache } from '@/hooks/useReplicache';
import { useSpace } from '@/hooks/useSpace';

import IconButton from '@/components/buttons/IconButton';

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

  //#region  //*=========== Labels ===========
  const labelsOptions = [
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
  const [chosenLabels, setChosenLabels] = React.useState<
    { label: string; value: string }[]
  >([]);
  React.useEffect(() => {
    setChosenLabels(
      (todo.labelOnTodos ?? []).map((l) => ({
        label: l.label.name.toLowerCase(),
        value: l.label.name.toLowerCase(),
      }))
    );
  }, [todo.labelOnTodos]);
  //#endregion  //*======== Labels ===========

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
    <div key={idbKey} className='flex items-center gap-4'>
      <IconButton
        variant='light'
        icon={Trash}
        onClick={() => {
          rep?.mutate.todoDelete({
            id: todo.id,
          });
        }}
      />
      <div className='flex flex-col gap-2'>
        <div className='space-x-4'>
          <span className='font-mono text-xs text-gray-700'>{todo.id}</span>
          <span>{todo.title}</span>
          <span className='text-green-600'>#{todo.GithubIssue?.number}</span>
          <select
            name='project'
            id='project'
            value={project}
            onChange={(e) => {
              rep?.mutate.todoUpdate({
                id: todo.id,
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
        <CreatableSelect
          isMulti
          options={labelsOptions}
          value={chosenLabels}
          onChange={(selected) => {
            setChosenLabels(Array.from(selected ?? []));
          }}
          closeMenuOnSelect={false}
          onMenuClose={() => {
            rep?.mutate.todoUpdate({
              id: todo.id,
              labelOnTodos: chosenLabels.map((label) => {
                // check is label exist
                const existingLabel = todo.labelOnTodos?.find(
                  (lot) => lot.label.name.toLowerCase() === label.value
                );

                if (existingLabel) {
                  return existingLabel;
                } else {
                  const labelId = nanoid();
                  return {
                    id: nanoid(),
                    label: {
                      id: labelId,
                      name: label.value,
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
    </div>
  );
}
