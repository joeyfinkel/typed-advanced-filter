export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
export type JoinPath<K extends string, P extends string> = `${K}.${P}`;
export type Join<
  T extends Array<unknown>,
  TDelimiter extends string,
> = T extends [infer Head extends string, ...infer Rest extends Array<string>]
  ? `${Head}${Rest['length'] extends 0 ? '' : TDelimiter}${Join<
      Rest,
      TDelimiter
    >}`
  : '';
export type StringReplace<
  Word extends string,
  Search extends string,
  Replace extends string,
  Recurse extends boolean = false,
> = Word extends `${infer Prefix}${Search}${infer Suffix}`
  ? Recurse extends true
    ? StringReplace<`${Prefix}${Replace}${Suffix}`, Search, Replace, true>
    : `${Prefix}${Replace}${Suffix}`
  : Word;
export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | JoinPath<K, DeepKeys<T[K]>>
          : K
        : never;
    }[keyof T]
  : never;
// export type DeepKeyAt<TData, TKey, Path extends string = ''> = {
//   [P in keyof TData]: P extends string
//     ? P extends TKey
//       ? Path extends ''
//         ? P
//         : `${Path}.${P}`
//       : TData[P] extends object
//         ? DeepKeyAt<TData[P], TKey, Path extends '' ? P : `${Path}.${P}`>
//         : never
//     : never;
// }[keyof TData];
// export type DeepKeyAt<
//   T,
//   K extends string,
//   V = unknown,
//   Path extends string = ''
// > = {
//   [P in keyof T]:
//     P extends string
//       ? P extends K
//         ? V extends unknown
//           ? (Path extends '' ? P : `${Path}.${P}`)
//           : (T[P] extends V
//               ? (Path extends '' ? P : `${Path}.${P}`)
//               : never)
//         : T[P] extends object
//           ? DeepKeyAt<
//               T[P],
//               K,
//               V,
//               Path extends '' ? P : `${Path}.${P}`
//             >
//           : never
//       : never
// }[keyof T];
export type DeepKeyAt<
  T,
  K extends string,
  Suffix extends string = '',
  Path extends string = ''
> = {
  [P in keyof T]:
    P extends string
      ? P extends K
        ? Suffix extends ''
          ? (Path extends '' ? P : `${Path}.${P}`)
          : (Path extends '' ? `${P}.${Suffix}` : `${Path}.${P}.${Suffix}`)
        : T[P] extends object
          ? DeepKeyAt<
              T[P],
              K,
              Suffix,
              Path extends '' ? P : `${Path}.${P}`
            >
          : never
      : never
}[keyof T];

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
  K extends keyof T,
> = T[K];
export type Split<
  S extends string,
  D extends string,
> = S extends `${infer Part}${D}${infer Rest}`
  ? [Part, ...Split<Rest, D>]
  : [S];
export type Includes<
  T extends string,
  U extends string,
> = T extends `${infer _Start}${U}${infer _End}` ? true : false;
export type Flatten<T extends Array<any>> = T['length'] extends 0
  ? T
  : T extends [infer K, ...infer R]
    ? K extends Array<any>
      ? [...Flatten<K>, ...Flatten<R>]
      : [K, ...Flatten<R>]
    : never;
export type RemovePrefix<
  T extends string,
  Prefix extends string,
> = T extends `${Prefix}${infer Rest}` ? Rest : T;
export type Entry<T> = [keyof T, T[keyof T]];
export type Entries<T> = Array<Entry<T>>;
export type GetKey<T> = keyof T;
export type DeepMutable<T> = T extends (...args: any[]) => any
  ? T // Leave functions as-is
  : T extends ReadonlyArray<infer U>
    ? DeepMutableArray<U>
    : T extends object
      ? { -readonly [P in keyof T]: DeepMutable<T[P]> }
      : T;

interface DeepMutableArray<T> extends Array<DeepMutable<T>> {}

// export function typedEntries<T>(o: T | ArrayLike<T>): Entries<T>;
export function typedEntries<T, S extends keyof T>(
  o: { [s in S]: T } | ArrayLike<T>
) {
  return Object.entries(o) as Array<[S, T]>;
}
export function entries<T extends {}>(o: T) {
  return Object.entries(o) as Entries<T>;
}
export function typedSplit<Word extends string, Separator extends string>(
  word: Word,
  separator: Separator
) {
  const split = word.split(separator) as Split<Word, Separator>;

  return split;
}
export function typedJoin<
  Words extends Array<unknown>,
  Separator extends string,
>(word: Words, separator: Separator) {
  return word.join(separator) as Join<Words, Separator>;
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

export function deepMerge<TTarget extends object, TSource extends object>(
  target: TTarget,
  source: TSource
): TTarget & TSource {
  // Create a new object to avoid mutating either input
  const output = { ...target } as TTarget & TSource;

  // If source isn't an object, return target as is
  if (!source || typeof source !== 'object') {
    return output;
  }

  // Iterate through all properties in source
  Object.keys(source).forEach((key) => {
    const targetValue = (target as any)[key];
    const sourceValue = (source as any)[key];

    // Handle arrays specially - concat them
    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      (output as any)[key] = [...targetValue, ...sourceValue];
    }
    // If both values are objects, recursively merge them
    else if (
      targetValue &&
      typeof targetValue === 'object' &&
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      (output as any)[key] = deepMerge(targetValue, sourceValue);
    }
    // Otherwise just use the source value
    else {
      (output as any)[key] = sourceValue;
    }
  });

  return output;
}

type DeepReplaceCallback = (params: {
  key: string | number | undefined;
  value: any;
  path: (string | number)[];
}) => any;

export function deepReplace<T>(
  obj: T,
  callback: DeepReplaceCallback,
  path: (string | number)[] = []
): T {
  // Handle null or undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, index) =>
      deepReplace(item, callback, [...path, index])
    ) as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const newObj = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = deepReplace(obj[key], callback, [...path, key]);
      }
    }
    return newObj;
  }

  // Handle primitive values
  return callback({ key: path[path.length - 1], value: obj, path });
}

export function findCommon<
  T1 extends object,
  T2 extends object,
  TSearchKey extends keyof T1 | keyof T2 = never,
>(left: T1, right: T2, searchKey?: TSearchKey) {
  if (searchKey) {
    // If searchKey is provided, check if it exists in both objects
    if (searchKey in left && searchKey in right) {
      return {
        [searchKey]: right[searchKey as keyof T2],
      };
    }

    return undefined;
  }

  // Original logic for finding first common key
  const keys1 = Object.keys(left) as (keyof T1)[];
  const keys2 = Object.keys(right) as (keyof T2)[];

  const commonKey = keys1.find((key) =>
    keys2.includes(key as unknown as keyof T2)
  );

  //   return commonKey ? right[commonKey as keyof T2] : undefined;
  if (commonKey) {
    return {
      [String(commonKey)]: right[commonKey as unknown as keyof T2],
    };
  }

  return undefined;
}
