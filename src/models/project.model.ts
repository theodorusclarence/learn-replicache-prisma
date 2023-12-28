import { Project } from '@prisma/client';

export type ProjectCreateArgs = Omit<
  Project,
  'version' | 'spaceId' | 'isDeleted'
>;

export type ProjectDeleteArgs = Pick<Project, 'id'>;

export type ProjectUpdateArgs = Omit<
  Project,
  'spaceId' | 'isDeleted' | 'version'
>;
