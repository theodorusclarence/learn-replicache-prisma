import { Project } from '@prisma/client';

export type ProjectCreateArgs = Omit<
  Project,
  'version' | 'spaceId' | 'createdAt' | 'updatedAt' | 'isDeleted'
>;

export type ProjectDeleteArgs = Pick<Project, 'id'>;

export type ProjectUpdateArgs = Omit<
  Project,
  'createdAt' | 'updatedAt' | 'spaceId' | 'isDeleted' | 'version'
>;
