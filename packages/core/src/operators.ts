import { z } from 'zod';
import { FilterTypes, NonNestedFilterTypes } from './row';
import { DeepKeys, DeepValueAt, EnsureIs } from './utils';

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
/**
 * Gets the operator for the given filter type.
 */
export type GetOperator<TFilterType extends FilterTypes = FilterTypes> =
  TFilterType extends `${infer Top}.${infer Nested}`
    ? DeepFilterOperator<Top, Nested> extends object
      ? Nested extends `.${string}`
        ? `TODO: Fix this -> "${Nested} extends .string"`
        : never
      : DeepValueAt<FilterOperatorMap, TFilterType>
    : DeepValueAt<FilterOperatorMap, TFilterType> extends object
    ? // CASE: Key = 'foo.bar'
      DeepValueAt<FilterOperatorMap, TFilterType>['main']
    : // CASE: Key = 'foo'
      DeepValueAt<FilterOperatorMap, TFilterType>;

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
      main: dateOperators,
      weekdays: dateOperators,
      weekends: dateOperators,
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

/**
 * Checks if the {@linkcode operator} is valid for the given {@linkcode filterType}.
 */
export function isValidOperator<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<FilterTypes>
>(filterType: TFilterType, operator: TOperator): operator is TOperator {
  // TODO Add check for nested filters

  const shape = filterOperatorMap.shape[filterType as NonNestedFilterTypes];
  const parsed = shape.safeParse(operator);

  return parsed.success;
}

export function getOperators<TFilterType extends FilterTypes>(
  filterType: TFilterType
) {
  const shape = filterOperatorMap.shape[filterType as NonNestedFilterTypes];

  if ('options' in shape._def) {
    const options = shape._def.options.flatMap(({ _def }) => _def.values);

    return options;
  }
}
