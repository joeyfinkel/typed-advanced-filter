import { DeepMutable, Prettify } from '../utils';

export type DeepKeysOfObjectsOnly<T> = {
  [K in keyof T]: T[K] extends object
    ? T[K] extends Array<any> | Function
      ? never
      : K extends string
        ? K | `${K}.${DeepKeysOfObjectsOnly<T[K]>}`
        : never
    : never;
}[keyof T];
type AdditionalObject<T> = T extends (...args: any[]) => infer R ? R : T;
type AddPropertyOptions<
  TSource extends object,
  TAdditional extends object | (() => object),
  TApplyTo extends Array<DeepKeysOfObjectsOnly<TSource>> = [],
  TIgnore extends Array<DeepKeysOfObjectsOnly<TSource>> = [],
> = {
  source: TSource;
  additionalProperties: TAdditional;
} & (
  | {
      /**
       * Array of keys to apply the `additionalProperties` to.
       */
      applyTo?: TApplyTo;
    }
  | {
      /**
       * Array of keys to ignore when applying the `additionalProperties`.
       */
      ignore?: TIgnore;
    }
);

type JoinPath<T extends string[], Acc extends string = ''> = T extends [
  infer F extends string,
  ...infer R extends string[],
]
  ? JoinPath<R, Acc extends '' ? F : `${Acc}.${F}`>
  : Acc;

// Helper: Should we add TAdditional at this path?
type ShouldAdd<
  Path extends string,
  TApplyTo extends string[],
  TIgnore extends string[],
> = TIgnore extends [any, ...any]
  ? Path extends TIgnore[number]
    ? false
    : true
  : TApplyTo extends [any, ...any]
    ? Path extends TApplyTo[number]
      ? true
      : false
    : true;

// Main recursive type
type AddPropertiesResultHelper<
  TSource,
  TAdditional,
  TApplyTo extends string[],
  TIgnore extends string[],
  Path extends string[] = [],
> = TSource extends object
  ? TSource extends Array<any>
    ? TSource // Don't add to arrays
    : TSource extends Date
      ? TSource
      : Prettify<
          {
            [K in keyof TSource]: AddPropertiesResultHelper<
              TSource[K],
              TAdditional,
              TApplyTo,
              TIgnore,
              [...Path, K & string]
            >;
          } & (ShouldAdd<JoinPath<Path>, TApplyTo, TIgnore> extends true
            ? AdditionalObject<TAdditional>
            : {})
        >
  : TSource;

export type AddPropertiesResult<
  TSource extends object,
  TAdditional extends object,
  TApplyTo extends Array<DeepKeysOfObjectsOnly<TSource>> = [],
  TIgnore extends Array<DeepKeysOfObjectsOnly<TSource>> = [],
> = DeepMutable<
  AddPropertiesResultHelper<
    TSource,
    TAdditional,
    TApplyTo extends string[] ? TApplyTo : [],
    TIgnore extends string[] ? TIgnore : [],
    []
  >
>;

function isPathInList<TSource extends object>(
  path: string,
  list?: Array<DeepKeysOfObjectsOnly<TSource>>
) {
  if (!list || list.length === 0) {
    return false;
  }

  return list.some((item) => item === path);
}

export function addProperties<
  const TSource extends object,
  const TAdditional extends object | (() => object),
  const TApplyTo extends Array<DeepKeysOfObjectsOnly<TSource>> = [],
  const TIgnore extends Array<DeepKeysOfObjectsOnly<TSource>> = [],
>(options: AddPropertyOptions<TSource, TAdditional, TApplyTo, TIgnore>) {
  const { source, additionalProperties } = options;
  let applyTo: Array<DeepKeysOfObjectsOnly<TSource>> = [];
  let ignore: Array<DeepKeysOfObjectsOnly<TSource>> = [];

  if ('applyTo' in options && options.applyTo) {
    applyTo = options.applyTo;
  }

  if ('ignore' in options && options.ignore) {
    ignore = options.ignore;
  }

  // Recursive function to traverse and add properties
  function traverseAndAddProperties<T>(obj: T, currentPath = '') {
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      // Skip if in ignore list
      if (isPathInList(fullPath, ignore)) {
        continue;
      }

      const value = obj[key];

      // Only process if value is an object (not null, not array)
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Determine if we should add properties here
        const shouldAdd =
          applyTo.length > 0 ? isPathInList(fullPath, applyTo) : true; // If no applyTo, add to all non-ignored objects

        if (shouldAdd) {
          obj[key] = {
            ...value,
            ...(typeof additionalProperties === 'function'
              ? additionalProperties()
              : additionalProperties),
          };
        }

        // Recurse into nested object
        traverseAndAddProperties(obj[key], fullPath);
      }
    }
  }

  traverseAndAddProperties(source);

  return source as AddPropertiesResult<TSource, TAdditional, TApplyTo, TIgnore>;
}
