import { z, ZodEnum, ZodUnion } from 'zod';
import { DetailedError } from './errors/detailedError';
import { FilterTypes, NestedFilterTypes, NonNestedFilterTypes } from './row';
import {
  DeepKeys,
  DeepValueAt,
  EnsureIs,
  Includes,
  Split,
  typedSplit,
} from './utils';

export type ContainsOperators = z.infer<typeof containsOperators>;
export type RangeOperators = z.infer<typeof rangeOperators>;
export type EqualityOperators = z.infer<typeof equalityOperators>;
export type EmptyOperators = z.infer<typeof emptyOperators>;
export type StringOperators = z.infer<typeof stringOperators>;
export type NumberOperators = z.infer<typeof numberOperators>;
export type Weekends = z.infer<typeof weekends>;
export type Weekdays = z.infer<typeof weekdays>;
export type Days = z.infer<typeof days>;
export type BasicDateOperators = z.infer<typeof basicDateOperators>;
export type DateOperators = z.infer<typeof dateOperators>;
export type LogicalOperator = z.infer<typeof logicalOperators>;
export type FilterOperatorMap = z.infer<typeof filterOperatorMap>;

type DeepFilterOperator<Top, Nested> = DeepValueAt<
  DeepValueAt<FilterOperatorMap, EnsureIs<Top, FilterTypes>>,
  EnsureIs<
    Nested,
    DeepKeys<DeepValueAt<FilterOperatorMap, EnsureIs<Top, FilterTypes>>>
  >
>;
type GetMain<TFilterType extends FilterTypes> =
  DeepValueAt<FilterOperatorMap, TFilterType> extends object
    ? DeepValueAt<FilterOperatorMap, TFilterType>['main']
    : DeepValueAt<FilterOperatorMap, TFilterType>;

/**
 * Gets the operator for the given filter type.
 */
export type GetOperator<TFilterType extends FilterTypes = FilterTypes> =
  TFilterType extends `${infer Top}.${infer Nested}`
    ? DeepFilterOperator<Top, Nested> extends object
      ? Nested extends `.${string}`
        ? `TODO: Fix this -> "${Nested} extends .string"`
        : GetMain<
            `${Top}.${Nested}` extends FilterTypes
              ? `${Top}.${Nested}`
              : FilterTypes
          >
      : DeepValueAt<FilterOperatorMap, TFilterType>
    : GetMain<TFilterType>;

export type CreateOperatorMap<
  TKeys extends FilterTypes,
  Map extends { [Key in TKeys]: any },
> = Map;

type NestedOperators<TMain, TOther = unknown> = { main: TMain } & TOther;
type FilterOperatorMapShape = (typeof filterOperatorMap)['shape'];
type GetNestedShape<T, Parts extends string[]> = Parts extends [
  infer First extends string,
  ...infer Rest extends string[],
]
  ? First extends keyof T
    ? Rest['length'] extends 0
      ? T[First] extends z.ZodObject<infer S>
        ? S extends NestedOperators<infer Main>
          ? Main
          : S
        : T[First]
      : T[First] extends z.ZodObject<any>
        ? GetNestedShape<T[First]['shape'], Rest>
        : never
    : never
  : never;

type DeepShape<T extends FilterTypes> = T extends NestedFilterTypes
  ? Split<T, '.'> extends [
      infer First extends NonNestedFilterTypes,
      ...infer Rest extends string[],
    ]
    ? GetNestedShape<FilterOperatorMapShape, [First, ...Rest]>
    : `Somehow, "${T}" was not Split on the ".'s"`
  : T extends NonNestedFilterTypes
    ? FilterOperatorMapShape[T] extends z.ZodObject<infer S>
      ? Includes<T, '.'> extends true
        ? 'Is nested'
        : S extends NestedOperators<infer Main>
          ? Main
          : 'No need to get main'
      : FilterOperatorMapShape[T]
    : `Param ("${T}") is neither 'NestedFilterTypes' or 'NonNestedFilterTypes'`;

// const containsOperators = z.enum(['contains', 'not-contains']);
// const rangeOperators = z.enum(['gt', 'gte', 'lt', 'lte']);
// const equalityOperators = z.enum(['eq', 'neq']);
// const emptyOperators = z.enum(['is-empty', 'is-not-empty']);
// const stringOperators = z.union([
//   z.enum(['starts-with', 'ends-with']),
//   emptyOperators,
//   containsOperators,
// ]);
// const numberOperators = z.union([rangeOperators, equalityOperators]);

// const weekends = z.enum(['saturday', 'sunday']);
// const weekdays = z.enum([
//   'monday',
//   'tuesday',
//   'wednesday',
//   'thursday',
//   'friday',
// ]);
// const days = z.union([weekends, weekdays]);
// const basicDateOperators = z.enum([
//   'day-of-week',
//   'today',
//   'tomorrow',
//   'yesterday',
//   'custom-date',
// ]);
// const dateOperators = z.union([
//   numberOperators,
//   emptyOperators,
//   z.enum(['between']),
// ]);
const containsOperators = z.object({
  contains: z.never(),
  'not-contains': z.never(),
});

const rangeOperators = z.object({
  gt: z.never(),
  gte: z.never(),
  lt: z.never(),
  lte: z.never(),
});

const equalityOperators = z.object({
  eq: z.never(),
  neq: z.never(),
});

export const emptyOperators = z.object({
  'is-empty': z.never(),
  'is-not-empty': z.never(),
});

// Combine string operators using .merge()
const stringOperators = z
  .object({
    'starts-with': z.never(),
    'ends-with': z.never(),
  })
  .merge(emptyOperators)
  .merge(containsOperators);

// Combine number operators using .merge()
const numberOperators = rangeOperators.merge(equalityOperators);

// Define weekends and weekdays as object schemas
const weekends = z.object({
  saturday: z.never(),
  sunday: z.never(),
});

const weekdays = z.object({
  monday: z.never(),
  tuesday: z.never(),
  wednesday: z.never(),
  thursday: z.never(),
  friday: z.never(),
});

// Combine days into an object schema using .merge()
const days = weekends.merge(weekdays);

// Define basicDateOperators as an object schema
const basicDateOperators = z.object({
  'day-of-week': z.never(),
  today: z.never(),
  tomorrow: z.never(),
  yesterday: z.never(),
  'custom-date': z.never(),
});

// Combine dateOperators using .merge()
const dateOperators = numberOperators.merge(emptyOperators).merge(
  z.object({
    between: z.never(),
  })
);

const allFiltersMap = z.object({
  boolean: equalityOperators,
  string: stringOperators,
  number: numberOperators,
  date: z.object({
    main: dateOperators,
    basic: basicDateOperators,
    days: z.object({
      main: days,
      weekdays: weekdays,
      weekends: weekends,
    }),
  }),
  empty: z.never(),
});
export const filterOperatorMap = z.object({
  boolean: createEnumFromObject(equalityOperators),
  string: createEnumFromObject(stringOperators),
  number: createEnumFromObject(numberOperators),
  date: z.object({
    main: createEnumFromObject(dateOperators),
    basic: createEnumFromObject(basicDateOperators),
    days: z.object({
      main: createEnumFromObject(days),
      weekdays: createEnumFromObject(weekdays),
      weekends: createEnumFromObject(weekends),
    }),
  }),
  empty: z.never(),
});

export const logicalOperators = z.enum(['and', 'or']);

function createEnumFromObject<T extends z.ZodObject<any>>(objectSchema: T) {
  const [first, ...rest] = Object.keys(objectSchema.shape);

  return z.enum([first, ...rest]) as ReturnType<T['keyof']>;
}

function createFunctionSchema<
  T extends {},
  Keys extends keyof T,
  Config extends Record<Keys, z.ZodFunction<any, any>>,
>(object: T, config: Config): z.ZodObject<Config>;
function createFunctionSchema<
  T extends {},
  Keys extends keyof T,
  Function extends z.ZodFunction<any, any>,
>(object: T, func: Function): z.ZodObject<{ [Key in Keys]: Function }>;

function createFunctionSchema<
  T extends {},
  Keys extends keyof T,
  Function extends z.ZodFunction<any, any>,
>(object: T, func: Function) {
  let shape: z.ZodRawShape = {};

  for (const key of Object.keys(object)) {
    shape[key] = func;
  }

  return z.object(object) as z.ZodObject<{ [Key in Keys]: Function }>;
}

function is<
  TExpected extends TValue,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TValue = unknown,
>(schema: TSchema, value: TValue): value is TExpected {
  const result = schema.safeParse(value);

  return result.success;
}
export function isWeekend(day: string) {
  return is<keyof Weekends>(weekends, day);
}
export function isWeekday(day: string) {
  return is<keyof Weekdays>(createEnumFromObject(weekdays), day);
}
export function isDay(day: string) {
  return is<keyof Days>(createEnumFromObject(days), day);
}
export function isBasicDateOperator(operator: string) {
  return is<keyof BasicDateOperators>(
    createEnumFromObject(basicDateOperators),
    operator
  );
}
export function isDateOperator(operator: string) {
  return is<keyof DateOperators>(createEnumFromObject(dateOperators), operator);
}
export function isLogicalOperator(operator: string) {
  return is<LogicalOperator>(logicalOperators, operator);
}
export function isContainsOperator(operator: string) {
  return is<keyof ContainsOperators>(
    createEnumFromObject(containsOperators),
    operator
  );
}
export function isRangeOperator(operator: string) {
  return is<keyof RangeOperators>(
    createEnumFromObject(rangeOperators),
    operator
  );
}
export function isEmptyOperator(operator: string) {
  return is<keyof EmptyOperators>(
    createEnumFromObject(emptyOperators),
    operator
  );
}

function getShape<TFilterType extends FilterTypes>(filterType: TFilterType) {
  const segments = filterType.includes('.')
    ? typedSplit(filterType, '.')
    : [filterType];
  let currentSchema: z.ZodTypeAny = filterOperatorMap;

  for (const segment of segments) {
    if (!(currentSchema instanceof z.ZodObject)) {
      throw new Error(`Schema at path "${filterType}" is not a Zod object`);
    }

    const shape = currentSchema.shape;

    if (!(segment in shape)) {
      throw new Error(
        `Invalid path segment "${segment}" in path "${filterType}"`
      );
    }

    currentSchema = shape[segment];

    // If we have a nested operator schema with a 'main' property, return that
    if (
      currentSchema instanceof z.ZodObject &&
      'main' in currentSchema.shape &&
      // TODO `indexOf` is saying it needs `never`. Not sure why. Look into this
      segments.indexOf(segment as never) === segments.length - 1
    ) {
      currentSchema = currentSchema.shape.main;
    }
  }

  return currentSchema as DeepShape<TFilterType>;
}

/**
 * Checks if the {@linkcode operator} is valid for the given {@linkcode filterType}.
 */
export function isValidOperator<TFilterType extends FilterTypes>(
  filterType: TFilterType,
  operator: string
): operator is GetOperator<TFilterType> {
  const shape = getShape(filterType);

  if (shape) {
    // Now we have the final schema for the operator
    const parsed = shape.safeParse(operator);

    return parsed.success;
  }

  return false;
}

export function getOperators<TFilterType extends FilterTypes>(
  filterType: TFilterType
) {
  // const shape = filterOperatorMap.shape[filterType as NonNestedFilterTypes];
  const shape = getShape(filterType);

  if (shape instanceof ZodEnum) {
    return shape.options;
  }

  // if (shape instanceof ZodUnion) {
  //   return shape.options.flatMap(({ _def }) => {
  //     if (_def.typeName === 'ZodEnum') {
  //       return _def.values;
  //     }

  //     return [];
  //   });
  // }

  throw DetailedError.error(
    'getOperators',
    `No operators found for ${filterType}`
  );
}
