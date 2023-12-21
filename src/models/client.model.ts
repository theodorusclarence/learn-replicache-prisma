import { Client } from '@prisma/client';

export type ClientCreateArgs = Omit<Client, 'lastMutationId' | 'lastModified'>;

export type ClientUpdateArgs = Omit<Client, 'clientGroupId' | 'lastModified'>;
