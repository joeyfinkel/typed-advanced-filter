export type JoinPath<K extends string, P extends string> = `${K}.${P}`;
export type Join<
  T extends Array<unknown>,
  TDelimiter extends string,
> = T extends [infer Head extends string, ...infer Rest extends Array<string>]
  ? `${Head}${Rest['length'] extends 0 ? '' : TDelimiter}${Join<Rest, TDelimiter>}`
  : '';

export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | JoinPath<K, DeepKeys<T[K]>>
          : K
        : never;
    }[keyof T]
  : never;
export type DeepValueAt<T, P extends DeepKeys<T>> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? DeepValueAt<T[K], R & DeepKeys<T[K]>>
    : never
  : never;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type EnsureIs<T, U> = T extends U ? T : never;
export type MakeOptional<TSchema, TKey extends keyof TSchema> = Prettify<
  Omit<TSchema, TKey> & Partial<Pick<TSchema, TKey>>
>;
export type Replace<Schema, Key extends keyof Schema, Type> = Omit<
  Schema,
  Key
> & { [K in Key]: Type };
export type GetProp<
  T extends Partial<Record<string, unknown>>,
  K extends keyof T
> = T[K];
export type Split<
  S extends string,
  D extends string
> = S extends `${infer Part}${D}${infer Rest}`
  ? [Part, ...Split<Rest, D>]
  : [S];

export function typedEntries<S extends string, T>(
  o: { [s in S]: T } | ArrayLike<T>
) {
  return Object.entries(o) as Array<[S, T]>;
}
export function typedSplit<Word extends string, Separator extends string>(
  word: Word,
  separator: Separator
) {
  const split = word.split(separator) as Split<Word, Separator>;

  return split;
}
export function removeKeys<T extends object>(
  obj: T,
  keysToRemove: (keyof T)[]
) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key]) => !keysToRemove.includes(key as keyof T)
    )
  ) as T;
}
