import { User } from '@prisma/client';

export type UserCreateArgs = Omit<User, 'spaceId'>;
