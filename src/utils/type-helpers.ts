export type ConvertDate<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};
export type Merge<P, T> = Omit<P, keyof T> & T;
export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
export type PartialExcept<T, K extends keyof T> = RecursivePartial<T> &
  Pick<T, K>;
