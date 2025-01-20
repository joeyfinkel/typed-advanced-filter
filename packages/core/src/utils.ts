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
export type EnsureIs<T, U> = T extends U ? T : never;
