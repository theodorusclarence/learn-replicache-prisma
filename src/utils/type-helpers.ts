export type ConvertDate<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
export type PartialExcept<T, K extends keyof T> = RecursivePartial<T> &
  Pick<T, K>;

/** @see https://stackoverflow.com/a/76786394 */
type PickNullable<T> = {
  [P in keyof T as null extends T[P] ? P : never]: T[P];
};
type PickNotNullable<T> = {
  [P in keyof T as null extends T[P] ? never : P]: T[P];
};
export type NormalizePrisma<T> = {
  [K in keyof PickNotNullable<T>]: T[K];
} & {
  [K in keyof PickNullable<T>]?: T[K] | undefined;
};

export function isValidBody<T extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  fields: (keyof T)[]
): body is T {
  return Object.keys(body).every((key) => fields.includes(key));
}
