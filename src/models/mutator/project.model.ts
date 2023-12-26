import { Mutator } from '@/models/mutator/index.model';
import {
  ProjectCreateArgs,
  ProjectDeleteArgs,
  ProjectUpdateArgs,
} from '@/models/project.model';

export type ProjectMutators<Type = 'client' | 'server'> = {
  projectCreate: Mutator<Type, ProjectCreateArgs>;
  projectDelete: Mutator<Type, ProjectDeleteArgs>;
  projectUpdate: Mutator<Type, ProjectUpdateArgs>;
};
