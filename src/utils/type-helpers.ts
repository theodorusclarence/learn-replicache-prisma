export type ConvertDate<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

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
