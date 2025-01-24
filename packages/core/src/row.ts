import { FilterOperatorMap, GetOperator } from './operators';
import { buildRules, RuleMap, RuleSchema } from './rule';
import { DeepKeys, Prettify, typedEntries } from './utils';

export type NonNestedFilterTypes = Exclude<FilterTypes, `${string}.${string}`>;
export type NestedFilterTypes = Exclude<FilterTypes, NonNestedFilterTypes>;

export type FilterTypes = Exclude<
  DeepKeys<FilterOperatorMap>,
  `${string}.main`
>;
export type GetFilterTypeByValue<TValue extends GetOperator = GetOperator> =
  keyof {
    [K in keyof FilterOperatorMap as TValue extends FilterOperatorMap[K]
      ? K
      : never]: true;
  };

export type Options<TValue extends string = string> = {
  text: string;
  value: TValue;
};

type BaseRowOptions<
  TFilterType extends FilterTypes,
  TValue extends PropertyKey,
  TOperator extends GetOperator<TFilterType>
> = {
  text: string;
  /**
   * The order the rules should appear in. If omitted, the rules will appear
   * in the same order as the config.
   */
  order?: number;
  isActive?: boolean;
  value: TValue;
  type: TFilterType;
  // rules: RuleMap<TFilterType, TOperator>;
  rules: RuleMap<TFilterType, TOperator>;
};
export type CustomOptionType = 'merge' | 'replace';
export type CustomOptions<
  TValue extends string,
  AddType extends boolean = false
> = Prettify<
  (AddType extends true
    ? {
        /**
         * How the `options` will be show.
         * - `replace`: The new `options` will be shown instead of the default options.
         * - `merge`: The new `options` will be shown with the default options.
         * @default 'replace'
         */
        type?: CustomOptionType;
      }
    : {}) & {
    options: Array<Options<TValue>>;
  }
>;
export type SpecificRowOptionMap = {
  boolean: Partial<CustomOptions<GetOperator<'boolean'>>>;
} & {
  [Key in `date${string}`]: {
    /**
     * The first date that will become selectable.
     */
    from?: Date;
    /**
     * The last date that will become selectable.
     */
    to?: Date;
  };
};
export type RowOptions<
  TFilterType extends FilterTypes = FilterTypes,
  TValue extends PropertyKey = string,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>
> = Prettify<
  BaseRowOptions<TFilterType, TValue, TOperator> &
    (TFilterType extends keyof SpecificRowOptionMap
      ? SpecificRowOptionMap[TFilterType]
      : {})
>;
export type RowResultOptions<
  TFilterType extends FilterTypes,
  TValue extends string,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>
> = Prettify<
  Omit<RowOptions<TFilterType, TValue, TOperator>, 'rules'> & {
    rules: RuleSchema<TFilterType>;
  }
>;
export type RowValue<
  TFilterType extends FilterTypes = FilterTypes,
  TValue extends PropertyKey = string,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>
> = Omit<RowOptions<TFilterType, TValue, TOperator>, 'value'> & {
  value?: TValue | (string & {});
};
export type RowMap<TKeys extends string = string> = Record<TKeys, RowValue>;
export type GetRowMapProps<
  TMap extends RowMap,
  TProp extends keyof TMap[keyof TMap]
> = TMap[keyof TMap] extends string ? TMap[keyof TMap][TProp] : never;
export type Row<TMap extends Partial<RowMap>> = Prettify<
  Omit<
    // TODO Fix these errors
    RowOptions<
      // @ts-expect-error - Type 'TMap[keyof TMap]["type"]' does not satisfy the constraint 'FilterTypes'.
      TMap[keyof TMap]['type'],
      keyof TMap,
      GetOperator<
        // @ts-expect-error - Type 'TMap[keyof TMap]["type"]' does not satisfy the constraint 'FilterTypes'.
        TMap[keyof TMap]['type']
      >
    >,
    'rules'
  >
> & { rules: RuleSchema<FilterTypes> };

function formatRows<TMap extends RowMap>(map: TMap) {
  const rows: Array<Row<TMap>> = [];

  for (const [key, { rules: inferredRules, value, ...rest }] of typedEntries(
    map
  )) {
    const rowValue = value ?? key;
    const rules = buildRules({ filterType: rest.type, rules: inferredRules });
    const row = {
      rules,
      value: rowValue,
      ...rest,
    };

    // TODO Fix this 'as any' cast
    rows.push(row as any);
  }

  return rows;
}

/**
 * Create filter rows with the given configuration.
 * @param keys A list of the row keys to create.
 * @param rows The row configuration. Each row must have a key that matches the key in the `keys` array.
 */
export function createFilterRows<
  const TKeys extends string,
  TMap extends RowMap<TKeys>
>(keys: Array<TKeys>, rows: TMap): Array<Row<TMap>>;
/**
 * Create filter rows with the given configuration.
 * @param rows The row configuration.
 */
// TODO Autocomplete for the `rows` parameter is not working
export function createFilterRows<TMap extends RowMap>(
  rows: TMap
): Array<Row<TMap>>;
export function createFilterRows<
  const TKeys extends string,
  TMap extends RowMap
>(rowsOrKeys: TMap | Array<TKeys>, rows?: TMap) {
  if (Array.isArray(rowsOrKeys)) {
    if (!rows) {
      throw new Error('[createFilterRows]: Provided `keys` but no `config`');
    }

    return formatRows(rows);
  }

  return formatRows(rowsOrKeys);
}
