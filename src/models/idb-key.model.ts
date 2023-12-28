export const IDB_KEY = {
  TODO: ({ spaceId, id = '' }: { spaceId: string | null; id?: string }) =>
    `${spaceId}/todo/${id}`,
  PROJECT: ({ spaceId, id = '' }: { spaceId: string | null; id?: string }) =>
    `${spaceId}/project/${id}`,
};
