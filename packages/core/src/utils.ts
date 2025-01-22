export type JoinPath<K extends string, P extends string> = `${K}.${P}`;
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

export function typedEntries<S extends string, T>(
  o: { [s in S]: T } | ArrayLike<T>
) {
  return Object.entries(o) as Array<[S, T]>;
}
