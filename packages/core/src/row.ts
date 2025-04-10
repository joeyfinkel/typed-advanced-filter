import { DetailedError } from './errors/detailedError';
import {
  CreateFilterOptions1,
  RowFilter,
  RowFilterMap
} from './filter';
import { FilterOperatorMap, GetOperator } from './operators';
import { buildRules, RuleMap, RuleSchema } from './rule';
import { DeepKeys, entries, Prettify } from './utils';

// Get all keys of the Zod object, including nested keys
export type NonNestedFilterTypes = Exclude<FilterTypes, `${string}.${string}`>;
export type NestedFilterTypes = Exclude<FilterTypes, NonNestedFilterTypes>;
export type FilterTypes = Exclude<
  DeepKeys<FilterOperatorMap>,
  `${string}.main`
>;
export type DateFilterTypes = Extract<FilterTypes, `date.${string}`>;
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
  TOperator extends GetOperator<TFilterType>,
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
  AddType extends boolean = false,
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
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>,
> = Prettify<
  BaseRowOptions<TFilterType, TValue, TOperator> &
    (TFilterType extends keyof SpecificRowOptionMap
      ? SpecificRowOptionMap[TFilterType]
      : {})
>;
export type RowResultOptions<
  TFilterType extends FilterTypes,
  TValue extends string,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>,
> = Prettify<
  Omit<RowOptions<TFilterType, TValue, TOperator>, 'rules'> & {
    rules: RuleSchema<TFilterType>;
  }
>;
export type RowValue<
  TFilterType extends FilterTypes = FilterTypes,
  TValue extends PropertyKey = string,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>,
> = Omit<RowOptions<TFilterType, TValue, TOperator>, 'value'> & {
  value?: TValue | (string & {});
};
export type RowValueSchema<
  TFilterType extends FilterTypes = FilterTypes,
  TValue extends PropertyKey = string,
> = {
  [Key in TFilterType]: RowValue<Key, TValue, GetOperator<Key>>;
}[TFilterType];
export type RowMap<TKeys extends string = string> = Record<
  TKeys,
  RowValueSchema
>;
export type GetRowMapProps<
  TMap extends RowMap,
  TProp extends keyof TMap[keyof TMap],
> = TMap[keyof TMap] extends string ? TMap[keyof TMap][TProp] : never;
export type Row<TMap extends Partial<RowMap>> = Omit<
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
> & { rules: RuleSchema<FilterTypes> };

export class Rows<in out TMap extends RowMap> extends Array<Row<TMap>> {
  private constructor() {
    super();
  }

  /**
   * Gets a row by it's value.
   * @param value The value of the row to get.
   */
  // @ts-expect-error - Type 'TMap[TKey]' does not satisfy the constraint 'Partial<RowMap<string>>'.
  get<TKey extends keyof TMap>(key: TKey): Row<TMap[TKey]> | undefined;
  /**
   * Gets a row at the given index.
   */
  get(index: number): Row<TMap> | undefined;
  get<TKey extends keyof TMap>(param: TKey | number) {
    if (typeof param === 'string') {
      return this.find(({ value }) => value === param) as  // @ts-expect-error - Type 'TMap[TKey]' does not satisfy the constraint 'Partial<RowMap<string>>'.
        | Row<TMap[TKey]>
        | undefined;
    }

    if (typeof param === 'number') {
      return this[param];
    }

    throw new Error(
      'Type of param must either be a number or a key of the row map'
    );
  }

  /**
   * Finds the first row.
   */
  findFirst(): Row<TMap> | undefined {
    return this[0];
  }

  static format<TMap extends RowMap>(rowMap: TMap) {
    const rows = new Rows<TMap>();

    for (const [key, { rules: inferredRules, value, ...rest }] of entries(
      rowMap
    )) {
      const rowValue = value ?? key;
      const rules = buildRules({ filterType: rest.type, rules: inferredRules });
      const row = {
        rules,
        value: rowValue,
        ...rest,
      } as unknown as Row<TMap>;

      rows.push(row);
    }

    return rows;
  }

  public toRowMap() {
    let rowMap: Record<string, unknown> = {};

    for (const { value, ...rest } of this) {
      rowMap[value as string] = rest;
    }

    return rowMap as TMap;
  }

  createFilter<TFilterMap extends RowFilterMap<TMap>>(
    options: CreateFilterOptions1<TMap, TFilterMap>
  ) {
    const rowFilter = new RowFilter(this.toRowMap());

    return rowFilter.createFilter(options);
  }
}

/**
 * Create filter rows with the given configuration.
 * @param rows The row configuration.
 */
export function createAdvancedFilterRows<TMap extends RowMap>(
  rows: TMap
): Rows<TMap>;
/**
 * Create filter rows with the given configuration.
 * @param keys A list of the row keys to create.
 * @param rows The row configuration. Each row must have a key that matches the key in the `keys` array.
 * @throws `DetailedError` if no {@linkcode rows} are provided.
 */
export function createAdvancedFilterRows<
  const TKeys extends string,
  TMap extends RowMap<TKeys>,
>(keys: Array<TKeys>, rows: TMap): Rows<TMap>;
export function createAdvancedFilterRows<
  const TKeys extends string,
  TMap extends RowMap<TKeys>,
>(rowsOrKeys: TMap | Array<TKeys>, rows?: TMap) {
  if (Array.isArray(rowsOrKeys)) {
    if (!rows) {
      throw DetailedError.error(
        'createFilterRows',
        'Provided "keys" but no "config"'
      );
    }

    return Rows.format(rows);
  }

  return Rows.format(rowsOrKeys);
}
