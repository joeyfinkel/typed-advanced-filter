import { z } from 'zod';
import { DetailedError } from './errors/detailedError';
import { FilterTypes, NonNestedFilterTypes } from './row';
import {
  DeepKeys,
  DeepValueAt,
  EnsureIs,
  Join,
  Split
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

type NestedOperators<TMain, TOther> = { main: TMain } & TOther;
type GetFilterMapShape<TFilterType extends FilterTypes> = Split<
  TFilterType,
  '.'
> extends [infer Top extends NonNestedFilterTypes, ...infer Rest]
  ? Rest extends []
    ? (typeof filterOperatorMap)['_output'][Top] extends NestedOperators<
        infer Main,
        infer Other
      >
      ? Rest[number] extends never
        ? Main
        : Other
      : (typeof filterOperatorMap)['_output'][Top]
    : Join<Rest, '.'> extends DeepKeys<
        (typeof filterOperatorMap)['_output'][Top]
      >
    ? Includes<
        Join<Rest, '.'>,
        keyof DeepValueAt<
          (typeof filterOperatorMap)['_output'][Top],
          Join<Rest, '.'>
        > extends string
          ? keyof DeepValueAt<
              (typeof filterOperatorMap)['_output'][Top],
              Join<Rest, '.'>
            >
          : string
      > extends false
      ? DeepValueAt<
          (typeof filterOperatorMap)['_output'][Top],
          Join<Rest, '.'>
        > extends NestedOperators<infer Main, infer _>
        ? Main
        : DeepValueAt<
            (typeof filterOperatorMap)['_output'][Top],
            Join<Rest, '.'>
          >
      : DeepValueAt<(typeof filterOperatorMap)['_output'][Top], Join<Rest, '.'>>
    : never
  : never;
type Includes<
  T extends string,
  U extends string
> = T extends `${infer _Start}${U}${infer _End}` ? true : false;

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

// function isNestedFilter<TFilterType extends FilterTypes>(
//   filterType: TFilterType
// ): filterType is Extract<FilterTypes, `${string}.${string}`> {
//   return filterType.includes('.');
// }

function getFilterMapShape<TFilterType extends FilterTypes>(
  filterType: TFilterType
) {
  const keys = filterType.split('.');
  let currentSchema: z.ZodType<any> | undefined = filterOperatorMap;

  for (const key of keys) {
    if (!currentSchema || !(currentSchema instanceof z.ZodObject)) {
      return undefined; // Not a valid schema or not an object
    }
    const shape = currentSchema.shape[key];

    if (!shape) {
      return undefined; // Key not found in the current schema
    }
    currentSchema = shape; // Move to the next level
  }

  return currentSchema;
}

/**
 * Checks if the {@linkcode operator} is valid for the given {@linkcode filterType}.
 */
export function isValidOperator<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<FilterTypes>
>(filterType: TFilterType, operator: TOperator): operator is TOperator {
  const shape = getFilterMapShape(filterType);

  if (shape) {
    // Now we have the final schema for the operator
    const parsed = shape.safeParse(operator);

    return parsed.success;
  }

  return false;
}
// export function isValidOperator<
//   TFilterType extends FilterTypes,
//   TOperator extends GetOperator<FilterTypes>
// >(
//   filterType: TFilterType,
//   operator: TOperator,
//   partIndexer = 0
// ): operator is TOperator {
//   // TODO Add check for nested filters

//   if (isNestedFilter(filterType)) {

//   }

//   const shape = filterOperatorMap.shape[filterType as NonNestedFilterTypes];
//   const parsed = shape.safeParse(operator);

//   return parsed.success;
// }
// function getOperatorsHelper<TFilterType extends FilterTypes>(
//   shape: z.ZodTypeAny
// ) {
//   if ('options' in shape._def && Array.isArray(shape._def.options)) {
//     const options = shape._def.options.flatMap((option) => {
//       if ('_def' in option) {
//         if ('options' in option._def) {
//           return option._def.options;
//         }

//         if ('values' in option._def) {
//           return option._def.options;
//         }
//       }
//     });

//     return options as Array<GetOperator<TFilterType>>;
//   }

//   if ('values' in shape._def) {
//     return shape._def.values as Array<GetOperator<TFilterType>>;
//   }

//   return [];
// }

function getOperatorsHelper<TFilterType extends FilterTypes>(
  shape: (typeof filterOperatorMap)['shape']['boolean']
) {
  if ('options' in shape._def && Array.isArray(shape._def.options)) {
    const options = shape._def.options.flatMap((option) => {
      if ('_def' in option) {
        if ('options' in option._def) {
          return option._def.options;
        }

        if ('values' in option._def) {
          return option._def.options;
        }
      }
    });

    return options as Array<GetOperator<TFilterType>>;
  }

  if ('values' in shape._def) {
    return shape._def.values as Array<GetOperator<TFilterType>>;
  }

  return [];
}

export function getOperators<TFilterType extends FilterTypes>(
  filterType: TFilterType
) {
  // const shape = filterOperatorMap.shape[filterType as NonNestedFilterTypes];
  const shape = getFilterMapShape(filterType);

  if (shape) {
    if ('shape' in shape && 'main' in shape.shape) {
      return getOperatorsHelper(shape.shape.main);
    }

    return getOperatorsHelper(shape);
  }

  throw new DetailedError(
    'getOperators',
    `No operators found for ${filterType}`
  );
}
