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

export type IsOperators = z.infer<typeof isOperators>;
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
export type FilterOperatorMap = z.infer<typeof filterOperatorMap>;

type DeepFilterOperator<Top, Nested> = DeepValueAt<
  DeepValueAt<FilterOperatorMap, EnsureIs<Top, FilterTypes>>,
  EnsureIs<
    Nested,
    DeepKeys<DeepValueAt<FilterOperatorMap, EnsureIs<Top, FilterTypes>>>
  >
>;
type GetMain<TFilterType extends FilterTypes> = DeepValueAt<
  FilterOperatorMap,
  TFilterType
> extends object
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

type NestedOperators<TMain, TOther = unknown> = { main: TMain } & TOther;
type FilterOperatorMapShape = (typeof filterOperatorMap)['shape'];
type GetNestedShape<T, Parts extends string[]> = Parts extends [
  infer First extends string,
  ...infer Rest extends string[]
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
      ...infer Rest extends string[]
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

const isOperators = z.enum(['is', 'is-not']);
const containsOperators = z.enum(['contains', 'not-contains']);
const rangeOperators = z.enum(['gt', 'gte', 'lt', 'lte']);
const equalityOperators = z.enum(['eq', 'neq']);
const emptyOperators = z.enum(['empty', 'not-empty']);
const stringOperators = z.union([
  z.enum(['starts-with', 'ends-with']),
  isOperators,
  containsOperators,
]);
const numberOperators = z.union([rangeOperators, equalityOperators]);

const weekends = z.enum(['saturday', 'sunday']);
const weekdays = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]);
const days = z.union([weekends, weekdays]);
const basicDateOperators = z.enum([
  'day-of-week',
  'today',
  'tomorrow',
  'yesterday',
  'custom-date',
]);
const dateOperators = z.union([
  numberOperators,
  emptyOperators,
  z.enum(['between']),
]);
export const filterOperatorMap = z.object({
  boolean: isOperators,
  string: stringOperators,
  number: numberOperators,
  date: z.object({
    main: dateOperators,
    basic: basicDateOperators,
    days: z.object({
      main: days,
      weekdays,
      weekends,
    }),
  }),
});

function is<
  TExpected extends TValue,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TValue = unknown
>(schema: TSchema, value: TValue): value is TExpected {
  const result = schema.safeParse(value);

  return result.success;
}
export function isWeekend(day: string) {
  return is<Weekends>(weekends, day);
}
export function isWeekday(day: string) {
  return is<Weekdays>(weekdays, day);
}
export function isDay(day: string) {
  return is<Days>(days, day);
}
export function isBasicDateOperator(operator: string) {
  return is<BasicDateOperators>(basicDateOperators, operator);
}
export function isDateOperator(operator: string) {
  return is<DateOperators>(dateOperators, operator);
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
export function isValidOperator<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<FilterTypes>
>(filterType: TFilterType, operator: TOperator): operator is TOperator {
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

  if (shape instanceof ZodUnion) {
    return shape.options.flatMap(({ _def }) => {
      if (_def.typeName === 'ZodEnum') {
        return _def.values;
      }

      return [];
    });
  }

  throw new DetailedError(
    'getOperators',
    `No operators found for ${filterType}`
  );
}
