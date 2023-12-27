export const IDB_KEY = {
  TODO: ({ spaceId, id }: { spaceId: string | null; id?: string }) =>
    `${spaceId}/${id}`,
  PROJECT: ({ spaceId, id }: { spaceId: string | null; id?: string }) =>
    `${spaceId}/project/${id}`,
};
