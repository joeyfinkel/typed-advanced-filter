import { Store } from '@tanstack/store';
import { DetailedError } from './errors/detailedError';
import {
  BasicDateOperators,
  CreateOperatorMap,
  Days,
  EmptyOperators,
  GetOperator,
  isEmptyOperator,
  isLogicalOperator,
  isValidOperator,
  LogicalOperator,
  logicalOperators,
} from './operators';
import { FilterTypes, NonNestedFilterTypes, RowMap } from './row';
import {
  deepMerge,
  EnsureIs,
  Entries,
  entries,
  Entry,
  Join,
  Prettify,
  StringReplace,
  typedJoin,
  UnionToIntersection,
} from './utils';
import { deepAddProperties } from './filter/utils';

export type FilterOptions<
  TRowMap extends RowMap,
  TKey extends keyof TRowMap,
  TFilterType extends TRowMap[TKey]['type'],
> = { operator: GetOperator<TFilterType>; value?: string };
export type Filter<TRowMap extends RowMap, TField extends keyof TRowMap> = {
  [Field in TField]?: FilterOptions<TRowMap, Field, TRowMap[TField]['type']>;
};
export type FilterMap<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
  TLogicalOperator extends LogicalOperator,
> = {
  [Key in TLogicalOperator]?: FilterMapValue<TRowMap, TField, TLogicalOperator>;
};
export type FilterMapValue<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
  TLogicalOperator extends LogicalOperator,
> =
  | Filter<TRowMap, TField>
  | Partial<FilterMap<TRowMap, TField, TLogicalOperator>>;

export type FilterRuleFunctionName<TField> = TField extends string
  ? StringReplace<TField, '-', '_', true>
  : TField;
type Months =
  | 'January'
  | 'February'
  | 'March'
  | 'April'
  | 'May'
  | 'June'
  | 'July'
  | 'August'
  | 'September'
  | 'October'
  | 'November'
  | 'December';
type CustomFilterDate = `${Months} ${number}, ${number}`;
type OpFunctionTypeMap = CreateOperatorMap<
  NonNestedFilterTypes,
  {
    string: string;
    number: number;
    boolean: boolean;
    date:
      | CustomFilterDate
      | (
          | keyof Days
          | Extract<
              keyof BasicDateOperators,
              'today' | 'tomorrow' | 'yesterday'
            >
        );
    empty: never;
  }
>;
type GetTypeFromFunctionTypeMap<TType extends FilterTypes> =
  TType extends keyof OpFunctionTypeMap ? OpFunctionTypeMap[TType] : never;
type FilterFunctionResult<
  TField extends string,
  TType extends string,
  TOperator extends string,
> = {
  field: TField;
  type: TType;
  operator: TOperator;
};
type EmptyQuery<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
> = `${TField} ${TOperator}`;
type EmptyFunction<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
> = () => FilterFunctionResult<TField, TType, TOperator> & {
  query: EmptyQuery<TField, TType, TOperator>;
};

type BetweenQuery<
  TField extends string,
  Value1 extends string,
  Value2 extends string,
> = `${TField} is between ${Value1} and ${Value2}`;
type BetweenFunction<
  TField extends string,
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>,
> = <
  Arg1 extends GetTypeFromFunctionTypeMap<TFilterType>,
  Arg2 extends GetTypeFromFunctionTypeMap<TFilterType>,
>(
  arg1: Arg1,
  arg2: Arg2
) => FilterFunctionResult<TField, TFilterType, TOperator> & {
  values: [Arg1, Arg2];
  query: BetweenQuery<TField, EnsureIs<Arg1, string>, EnsureIs<Arg2, string>>;
};
type GenericQuery<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
  TArg extends GetTypeFromFunctionTypeMap<TType>,
> = `${TField} ${TOperator} ${TArg}`;
type GenericFilterFunction<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
> = <Arg extends GetTypeFromFunctionTypeMap<TType>>(
  arg: Arg
) => FilterFunctionResult<TField, TType, TOperator> & {
  value: Arg;
  query: GenericQuery<TField, TType, TOperator, Arg>;
};
type FunctionNameMapValue<
  TField extends string = string,
  TType extends FilterTypes = FilterTypes,
  TOperator extends GetOperator<TType> = GetOperator<TType>,
> =
  | GenericFilterFunction<TField, TType, TOperator>
  | EmptyFunction<TField, TType, TOperator>
  | BetweenFunction<TField, TType, TOperator>;

export type FilterRowMapValue<
  TRowMap extends RowMap,
  TRowMapKey extends keyof TRowMap,
  TRuleKey extends keyof TRowMap[TRowMapKey]['rules'],
> =
  TRuleKey extends GetOperator<TRowMap[TRowMapKey]['type']>
    ? TRowMap[TRowMapKey]['rules'][TRuleKey] extends { type: 'empty' }
      ? EmptyFunction<
          EnsureIs<TRowMapKey, string>,
          TRowMap[TRowMapKey]['type'],
          TRuleKey
        >
      : TRuleKey extends 'between'
        ? BetweenFunction<
            EnsureIs<TRowMapKey, string>,
            TRowMap[TRowMapKey]['type'],
            TRuleKey
          >
        : GenericFilterFunction<
            EnsureIs<TRowMapKey, string>,
            TRowMap[TRowMapKey]['type'],
            TRuleKey
          >
    : never;
type Test = ReturnType<
  FilterRowMapValue<
    {
      name: {
        text: 'Name';
        type: 'string';
        rules: {
          contains: 'Contains';
          'not-contains': 'Not contains';
        };
      };
    },
    'name',
    'contains'
  >
>;
export type FilterRowFunctionMap<
  TRowMap extends RowMap,
  TKey extends keyof TRowMap,
> = {
  [RuleKey in keyof TRowMap[TKey]['rules'] as FilterRuleFunctionName<RuleKey>]: FilterRowMapValue<
    TRowMap,
    TKey,
    RuleKey
  >;
};
export type FilterRowMap<TRowMap extends RowMap> = {
  [Key in keyof TRowMap]: FilterRowFunctionMap<TRowMap, Key>;
};
export type LogicalOperatorFunctionResult<
  Type extends LogicalOperator,
  TRowMap extends RowMap,
  TKey extends keyof TRowMap,
  TRuleKey extends keyof TRowMap[TKey]['rules'],
  TFilter extends FilterParam<TRowMap, TKey, TRuleKey>,
  TFilters extends Readonly<[TFilter, ...TFilter[]]>,
> = {
  type: Type;
  filters: TFilters extends LogicalOperatorFunction<
    NoInfer<Type>,
    TRowMap,
    keyof TRowMap,
    keyof TRowMap[keyof TRowMap]['rules']
  >
    ? ReturnType<TFilters>
    : TFilters;
  queryString: Join<TFilters, ` ${Uppercase<Type>} `>;
  queryObject: any; // TODO
};
// export type LogicalOperatorFunction<Type extends LogicalOperator> = <
//   const TFilters extends Array<unknown>,
// >(
//   ...filters: TFilters
// ) => LogicalOperatorFunctionResult<Type, TFilters>;

type FilterParam<
  TRowMap extends RowMap,
  TKey extends keyof TRowMap,
  TRuleKey extends keyof TRowMap[TKey]['rules'],
> = ReturnType<FilterRowMapValue<TRowMap, TKey, TRuleKey>>;
// | LogicalOperatorFunction<LogicalOperator, TRowMap>;
export type LogicalOperatorFunction<
  Type extends LogicalOperator,
  TRowMap extends RowMap,
  TKey extends keyof TRowMap,
  TRuleKey extends keyof TRowMap[TKey]['rules'],
> = <
  const TFilter extends FilterParam<TRowMap, TKey, TRuleKey>,
  const TFilters extends Readonly<[TFilter, ...TFilter[]]>,
>(
  filters: TFilters
) => LogicalOperatorFunctionResult<
  Type,
  TRowMap,
  TKey,
  TRuleKey,
  TFilter,
  TFilters
>;

export type LogicalOperatorMap<TRowMap extends RowMap> = {
  and: LogicalOperatorFunction<
    'and',
    TRowMap,
    keyof TRowMap,
    keyof TRowMap[keyof TRowMap]['rules']
  >;
  or: LogicalOperatorFunction<
    'or',
    TRowMap,
    keyof TRowMap,
    keyof TRowMap[keyof TRowMap]['rules']
  >;
};

function emptyFunction<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
>(
  field: TField,
  type: TType,
  operator: TOperator
): EmptyFunction<TField, TType, TOperator> {
  return () => ({
    field,
    type,
    operator,
    query: `${field} ${operator}`,
  });
}

function betweenFunction<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
>(
  field: TField,
  type: TType,
  operator: TOperator
): BetweenFunction<TField, TType, TOperator> {
  return (arg1, arg2) => ({
    field,
    operator,
    query: `${field} is between ${arg1} and ${arg2}` as BetweenQuery<
      TField,
      EnsureIs<typeof arg1, string>,
      EnsureIs<typeof arg2, string>
    >,
    type,
    values: [arg1, arg2],
  });
}

function genericFilterFunction<
  TField extends string,
  TType extends FilterTypes,
  TOperator extends GetOperator<TType>,
>(
  field: TField,
  type: TType,
  operator: TOperator
): GenericFilterFunction<TField, TType, TOperator> {
  return (arg1) => ({
    field,
    type,
    operator,
    value: arg1,
    query: `${field} ${operator} ${arg1}` as GenericQuery<
      TField,
      TType,
      TOperator,
      typeof arg1
    >,
  });
}

function _joinQueries<
  TLogicalOperator extends LogicalOperator,
  const TQueries extends Array<string>,
>(logicalOperator: TLogicalOperator, ...queries: TQueries) {
  return typedJoin(
    queries,
    ` ${logicalOperator.toUpperCase() as Uppercase<TLogicalOperator>} `
  );
}

export function isFilterMap<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
  TLogicalOperator extends LogicalOperator,
>(
  value: FilterMapValue<TRowMap, TField, TLogicalOperator>
): value is FilterMap<TRowMap, TField, TLogicalOperator> {
  if ('and' in value || 'or' in value) {
    return true;
  }

  return false;
}

export function isFilter<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
  TLogicalOperator extends LogicalOperator,
>(
  value: FilterMapValue<TRowMap, TField, TLogicalOperator>
): value is Filter<TRowMap, TField> {
  return !isFilterMap(value);
}

type FilterConditionValue<
  TRowMap extends RowMap = RowMap,
  TField extends keyof TRowMap = keyof TRowMap,
  TOperator extends
    keyof TRowMap[TField]['rules'] = keyof TRowMap[keyof TRowMap]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TRowMap[TField]['type']
  > = GetTypeFromFunctionTypeMap<TRowMap[keyof TRowMap]['type']>,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<
    TRowMap[TField]['type']
  > = never,
> = TValue extends never
  ? {}
  : TOperator extends 'between'
    ? { values: [TValue, TAdditionalValue] }
    : { value: TValue };
// Error: Circular reference
type FilterCondition<
  TRowMap extends RowMap = RowMap,
  TField extends keyof TRowMap = keyof TRowMap,
  TOperator extends
    keyof TRowMap[TField]['rules'] = keyof TRowMap[keyof TRowMap]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TRowMap[TField]['type']
  > = GetTypeFromFunctionTypeMap<TRowMap[keyof TRowMap]['type']>,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<
    TRowMap[TField]['type']
  > = never,
> = {
  [Key in TField]: Prettify<
    FilterConditionValue<
      TRowMap,
      TField,
      TOperator,
      TValue,
      TAdditionalValue
    > & {
      operator: TOperator;
      type: TRowMap[TField]['type'];
    }
  >;
};

// type FilterGroup<
//   TLogicalOperator extends LogicalOperator = LogicalOperator,
//   TRowMap extends RowMap = RowMap,
//   TField extends keyof TRowMap = keyof TRowMap,
//   TOperator extends
//     keyof TRowMap[TField]['rules'] = keyof TRowMap[keyof TRowMap]['rules'],
//   TValue extends GetTypeFromFunctionTypeMap<
//     TRowMap[TField]['type']
//   > = GetTypeFromFunctionTypeMap<TRowMap[keyof TRowMap]['type']>,
//   TAdditionalValue extends GetTypeFromFunctionTypeMap<
//     TRowMap[TField]['type']
//   > = never,
//   TConditions extends FilterCondition<
//     TRowMap,
//     TField,
//     TOperator,
//     TValue,
//     TAdditionalValue
//   > = FilterCondition<TRowMap, TField, TOperator, TValue, TAdditionalValue>,
// > = {
//   operator: TLogicalOperator;
//   conditions: TConditions;
// };

type FilterGroup<
  TLogicalOperator extends LogicalOperator = LogicalOperator,
  TRowMap extends RowMap = RowMap,
> = Record<TLogicalOperator, { conditions: FilterCondition }>;
type DefaultFilterGroup<
  Key extends string,
  TRowMap extends RowMap = RowMap,
  TField extends keyof TRowMap = keyof TRowMap,
  TOperator extends
    keyof TRowMap[TField]['rules'] = keyof TRowMap[keyof TRowMap]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TRowMap[TField]['type']
  > = GetTypeFromFunctionTypeMap<TRowMap[keyof TRowMap]['type']>,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<
    TRowMap[TField]['type']
  > = never,
> = {
  [x in Key]: {
    conditions: FilterCondition<
      TRowMap,
      TField,
      TOperator,
      TValue,
      TAdditionalValue
    >;
  };
};

type GetConditionFromFilterGroup<Group extends FilterGroup> =
  Group[keyof Group] extends { conditions: infer C } ? C : never;

type JoinFilterGroups<
  Group1 extends FilterGroup,
  Group2 extends FilterGroup,
> = {
  [Key in keyof Group1]: Prettify<
    Key extends keyof Group2
      ? Prettify<
          {
            conditions: Prettify<
              GetConditionFromFilterGroup<Group1> &
                GetConditionFromFilterGroup<Group2>
            >;
          } & Omit<Group1[Key], 'conditions'> &
            Omit<Group2[Key], 'conditions'>
        >
      : { conditions: GetConditionFromFilterGroup<Group1> } & Group2
  >;
};

type SharedFilterResult<TOrResult, TAndResult, TBuildResult> = {
  or: TOrResult;
  and: TAndResult;
  build: () => TBuildResult;
};
type LogicalOperatorResult<
  TLogicalOperator extends LogicalOperator,
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
  TOperator extends keyof TRowMap[TField]['rules'],
  TType extends TRowMap[TField]['type'],
  TValue extends GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  >,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<TType>,
  TFilters extends FilterGroup<
    TLogicalOperator,
    TRowMap,
    TField,
    TOperator,
    TValue,
    TAdditionalValue
  >,
  TOr = LogicalOperatorFilterFunctionTest<'or', TRowMap, TFilters>,
  TAnd = LogicalOperatorFilterFunctionTest<'and', TRowMap, TFilters>,
> = SharedFilterResult<TOr, TAnd, TFilters>;

type FilterFunctionOptions<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
  TOperator extends keyof TRowMap[TField]['rules'],
  TValue,
> = Prettify<
  {
    field: TField;
    operator: TOperator;
  } & ([TValue] extends [never]
    ? {
        value?: never;
      }
    : {
        value: TValue;
      })
>;
type GetConditionalValue<
  TRowMap extends RowMap,
  TFields extends keyof TRowMap = keyof TRowMap,
  TType extends TRowMap[TFields]['type'] = TRowMap[keyof TRowMap]['type'],
  TOperator extends
    keyof TRowMap[TFields]['rules'] = keyof TRowMap[keyof TRowMap]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  > = GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  >,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<TType> = never,
> = TOperator extends 'between'
  ? [TValue, TAdditionalValue]
  : TOperator extends keyof EmptyOperators
    ? never
    : TValue;
type LogicalOperatorConditionOptions<
  TLogicalOperator extends LogicalOperator,
  TRowMap extends RowMap = RowMap,
> = Prettify<
  {
    [LogicalOperator in TLogicalOperator]: Prettify<
      FilterFunctionOptions<
        TRowMap,
        keyof TRowMap,
        keyof TRowMap[keyof TRowMap]['rules'],
        GetConditionalValue<TRowMap>
      >
    >;
  } & {
    [Key in Exclude<LogicalOperator, TLogicalOperator>]?: never;
  }
>;
type ConditionOptions<
  TRowMap extends RowMap,
  TFields extends keyof TRowMap = keyof TRowMap,
  TType extends TRowMap[TFields]['type'] = TRowMap[TFields]['type'],
  TOperator extends
    keyof TRowMap[TFields]['rules'] = keyof TRowMap[TFields]['rules'],
  TLogicalOperator extends LogicalOperator,
  TValue extends GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  > = GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  >,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<TType> = never,
> = FilterFunctionOptions<
  TRowMap,
  TFields,
  TOperator,
  GetConditionalValue<
    TRowMap,
    TFields,
    TType,
    TOperator,
    TValue,
    TAdditionalValue
  >
> &
  Partial<LogicalOperatorConditionOptions<TLogicalOperator, TRowMap>>;
export type CreateFilterOptions<
  TLogicalOperator extends LogicalOperator,
  TRowMap extends RowMap,
  TFields extends keyof TRowMap = keyof TRowMap,
  TType extends TRowMap[TFields]['type'] = TRowMap[TFields]['type'],
  TOperator extends
    keyof TRowMap[TFields]['rules'] = keyof TRowMap[TFields]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  > = GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  >,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<TType> = never,
> = FilterFunctionOptions<
  TRowMap,
  TFields,
  TOperator,
  GetConditionalValue<
    TRowMap,
    TFields,
    TType,
    TOperator,
    TValue,
    TAdditionalValue
  >
> &
  Partial<LogicalOperatorConditionOptions<TLogicalOperator, TRowMap>>;

type LogicalOperatorFilterFunctionTest<
  TLogicalOperator extends LogicalOperator,
  TRowMap extends RowMap,
  PreviousFilters extends FilterGroup<TLogicalOperator, TRowMap>,
> = <
  TField extends keyof TRowMap,
  TType extends TRowMap[TField]['type'],
  TOperator extends keyof TRowMap[TField]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  >,
  TValue2 extends GetTypeFromFunctionTypeMap<TType>,
  TFilters extends DefaultFilterGroup<
    TLogicalOperator,
    TRowMap,
    TField,
    TOperator,
    TValue,
    never
  >,
  JointFilters extends FilterGroup<
    TLogicalOperator,
    TRowMap,
    TField,
    TOperator,
    TValue,
    never,
    FilterCondition<TRowMap, TField, TOperator, TValue, never>
  > = JoinFilterGroups<PreviousFilters, TFilters>,
>(
  options: ConditionOptions<TRowMap, TField, TType, TOperator, TValue, TValue2>
) => LogicalOperatorResult<
  TLogicalOperator,
  TRowMap,
  TField,
  TOperator,
  TType,
  TValue,
  TValue2,
  JointFilters
>;

export type GetRuleKey<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
> = keyof TRowMap[TField]['rules'];
export type RowFilterValue<T> = [T] extends [never]
  ? { value?: never }
  : { value: T };
export type GetRowFilterValue<
  TRowMap extends RowMap,
  TFields extends keyof TRowMap = keyof TRowMap,
  TType extends TRowMap[TFields]['type'] = TRowMap[keyof TRowMap]['type'],
  TOperator extends
    keyof TRowMap[TFields]['rules'] = keyof TRowMap[keyof TRowMap]['rules'],
  TValue extends GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  > = GetTypeFromFunctionTypeMap<
    TOperator extends keyof EmptyOperators ? 'empty' : TType
  >,
  TAdditionalValue extends GetTypeFromFunctionTypeMap<TType> = never,
> = TOperator extends 'between'
  ? [TValue, TAdditionalValue]
  : TOperator extends keyof EmptyOperators
    ? never
    : TValue;
export type RowFilterOptions<
  TRowMap extends RowMap,
  TField extends keyof RowMap = keyof RowMap,
  TOperator extends
    keyof TRowMap[TField]['rules'] = keyof TRowMap[TField]['rules'],
  TValue extends GetRowFilterValue<
    TRowMap,
    TField,
    TRowMap[TField]['type'],
    TOperator
  > = GetRowFilterValue<TRowMap, TField, TRowMap[TField]['type'], TOperator>,
> = RowFilterValue<TValue> & {
  operator: TOperator;
};
export type RowFilterFieldMap<
  TRowMap extends RowMap,
  TField extends keyof TRowMap = keyof TRowMap,
  TAdditionalProps = {},
> = {
  [Field in TField]?: RowFilterOptions<
    TRowMap,
    EnsureIs<Field, string>,
    keyof TRowMap[Field]['rules'],
    GetRowFilterValue<
      TRowMap,
      Field,
      TRowMap[Field]['type'],
      keyof TRowMap[Field]['rules']
    >
  > &
    TAdditionalProps;
};
export type RowFilterMapValue<TRowMap extends RowMap, TAdditionalProps = {}> =
  | RowFilterFieldMap<TRowMap, keyof TRowMap, TAdditionalProps>
  | RowFilterMap<TRowMap>;
export type RowFilterMap<
  TRowMap extends RowMap,
  TAdditionalProps = {},
  TLogicalOperator extends LogicalOperator = LogicalOperator,
> = {
  // TODO Right now, it allows both 'and' and 'or'. Should only allow one of them
  [Op in TLogicalOperator]?: RowFilterMapValue<TRowMap, TAdditionalProps>;
};
export type FilterSymbols<
  TRowMap extends RowMap,
  TField extends keyof TRowMap,
> = {
  [Operator in keyof TRowMap[TField]['rules']]?: string;
};
export type GetFilterMapOperators<
  TRowMap extends RowMap,
  TFilterMap extends RowFilterMap<TRowMap>,
  TField extends FilterMapFields<TRowMap, TFilterMap>,
> = Prettify<
  UnionToIntersection<
    ExtractOperatorValuePairs<TFilterMap[keyof TFilterMap], TField>
  >
>;
type ExtractOperatorValuePairs<
  T,
  K extends string | number | symbol,
> = T extends object
  ? (T extends { [key in K]: infer OV }
      ? OV extends {
          operator: infer Operator extends string;
          value: infer Value;
        }
        ? { [key in Operator]: Value }
        : {}
      : {}) &
      (T extends Array<infer U>
        ? ExtractOperatorValuePairs<U, K>
        : {
            [P in keyof T]: ExtractOperatorValuePairs<T[P], K>;
          }[keyof T])
  : {};
type GetFilterMapKeys<
  TRowMap extends RowMap,
  TFilterMap extends RowFilterMap<TRowMap>,
> =
  | keyof TFilterMap[keyof TFilterMap]
  | {
      [Key in keyof TFilterMap[keyof TFilterMap]]: keyof TFilterMap[keyof TFilterMap][Key];
    }[keyof TFilterMap[keyof TFilterMap]];
type FilterMapFields<
  TRowMap extends RowMap,
  TFilterMap extends RowFilterMap<TRowMap>,
> = Exclude<
  GetFilterMapKeys<TRowMap, TFilterMap>,
  LogicalOperator | keyof RowFilterOptions<TRowMap>
>;
export type QueryStringTransformerOptions<
  TRowMap extends RowMap,
  TFilterMap extends RowFilterMap<TRowMap>,
  TField extends FilterMapFields<TRowMap, TFilterMap>,
  TOperators extends GetFilterMapOperators<TRowMap, TFilterMap, TField>,
> = {
  field: TField;
  operators: TOperators;
  queryStrings: { [Op in keyof TOperators]: string };
};
export type QueryStringTransformer<
  TRowMap extends RowMap,
  TFilterMap extends RowFilterMap<TRowMap>,
> = {
  [Key in FilterMapFields<TRowMap, TFilterMap>]?: (
    options: QueryStringTransformerOptions<
      TRowMap,
      TFilterMap,
      Key,
      GetFilterMapOperators<TRowMap, TFilterMap, Key>
    >
  ) => {
    [_Key in keyof GetFilterMapOperators<TRowMap, TFilterMap, Key>]?: string;
  };
};
export type CreateFilterOptions1<
  TRowMap extends RowMap,
  TFilterMap extends RowFilterMap<TRowMap>,
> = {
  filterMap: TFilterMap;
  /**
   * Whether parenthesis will be included in the final query string.
   *
   * @default true
   */
  includeParenthesis?: boolean;
  /**
   * A collection of text symbols to use instead of the operator in the result
   * query string.
   */
  customSymbols?: {
    /**
     * Custom symbols used for the logical operators in the query string.
     */
    logicalOperators?: { [Key in LogicalOperator]?: string };
    /**
     * Custom symbols that will be applied to all occurrences of the
     * filter rule in the query string.
     *
     * @remarks Specifying a custom symbol here will override any custom symbols
     * specified in `rowSpecific`.
     */
    globals?: {
      [Field in keyof TRowMap]?: FilterSymbols<TRowMap, Field>;
    }[keyof TRowMap];
    /**
     * Custom symbols that will be applied to the specific row in the query string.
     * @remarks Any rule specified here and in `globals` will use the custom symbol
     * found in `globals`.
     */
    rowSpecific?: {
      [Field in keyof TRowMap]?: FilterSymbols<TRowMap, Field>;
    };
  };
  queryStringTransformer?: QueryStringTransformer<TRowMap, TFilterMap>;
};
export type QueryString<TRowMap extends RowMap> = {
  [Key in keyof RowFilterMap<TRowMap>]: string;
};

export class RowFilter<TRowMap extends RowMap> {
  private rowMap!: TRowMap;
  // private filterMap!: TFilterMap
  private detailedError = new DetailedError('RowFilter', this);
  private listFormatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'disjunction',
  });
  private queryStrings = new Store<{
    [Key in keyof TRowMap]?: {
      [Operator in keyof TRowMap[Key]['rules']]?: {
        value: string;
        order: `${number}.${number}`;
        logicalOperator?: LogicalOperator;
      };
    };
  }>({});
  private queryStrings1 = new Store<
    RowFilterMap<TRowMap, { queryString: string }>
  >({});

  constructor(rowMap: TRowMap) {
    this.rowMap = rowMap;
  }

  isRowFilterFieldMap(
    field: keyof TRowMap,
    value: unknown
  ): value is RowFilterFieldMap<TRowMap> {
    if (typeof value !== 'object' || !value) {
      return false;
    }

    return field in this.rowMap && 'operator' in value && 'value' in value;
  }

  private getFilterMapOperators<
    TFilterMap extends RowFilterMap<TRowMap>,
    TField extends FilterMapFields<TRowMap, TFilterMap> = FilterMapFields<
      TRowMap,
      TFilterMap
    >,
  >(filterMapValue: RowFilterMapValue<TRowMap>, field?: TField) {
    let result: Record<string, unknown> = {};

    // Process the entries in the filter map value
    const filterMapEntries = entries(filterMapValue);

    function mergeResults(
      target: Record<string, unknown>,
      source: Record<string, unknown>
    ) {
      for (const key in source) {
        if (key in target) {
          // If both are objects, merge them recursively
          if (
            typeof target[key] === 'object' &&
            target[key] !== null &&
            typeof source[key] === 'object' &&
            source[key] !== null &&
            !Array.isArray(target[key]) &&
            !Array.isArray(source[key])
          ) {
            mergeResults(
              target[key] as Record<string, unknown>,
              source[key] as Record<string, unknown>
            );
          } else {
            // For non-objects, append the new value
            target[key] = source[key];
          }
        } else {
          // If key doesn't exist in target, simply add it
          target[key] = source[key];
        }
      }
    }

    for (const [key, data] of filterMapEntries) {
      // If we're looking for a specific field and this is it
      if (
        field &&
        key === field &&
        this.isRowFilterFieldMap(String(field), data)
      ) {
        const { operator, value } = data;
        result[String(operator)] = value;
      }
      // If this is a logical operator (AND, OR, etc.)
      else if (isLogicalOperator(key)) {
        // Process each item in the logical operator array
        if (Array.isArray(data)) {
          for (const item of data) {
            // Recursively get operators for this branch
            const nestedOperators = this.getFilterMapOperators<
              TFilterMap,
              TField
            >(item, field);

            mergeResults(result, nestedOperators);
          }
        }
        // Process non-array logical operator data (object)
        else if (data && typeof data === 'object') {
          // Recursively process this branch
          const nestedOperators = this.getFilterMapOperators<
            TFilterMap,
            TField
          >(data as RowFilterMapValue<TRowMap>, field);

          mergeResults(result, nestedOperators);
        }
      }
      // If we're collecting all fields or this is a nested object
      else if (!field || typeof data === 'object') {
        if (this.isRowFilterFieldMap(key, data)) {
          const { operator, value } = data;

          // If we're collecting all fields
          if (!field) {
            if (!result[key]) {
              result[key] = {};
            }
            (result[key] as Record<string, unknown>)[String(operator)] = value;
          }
        } else if (typeof data === 'object' && data !== null) {
          // Recursively process nested objects
          const nestedOperators = this.getFilterMapOperators<
            TFilterMap,
            TField
          >(data as RowFilterMapValue<TRowMap>, field);

          // If we have a specific field, directly merge the results
          if (field) {
            Object.assign(result, nestedOperators);
          }
          // Otherwise, add them under the current key
          else if (Object.keys(nestedOperators).length > 0) {
            result[key] = nestedOperators;
          }
        }
      }
    }

    return result as GetFilterMapOperators<TRowMap, TFilterMap, TField>;
  }

  private addQueryString(options: {
    field: string;
    operator: string;
    value: string;
    order: `${number}.${number}`;
    logicalOperator?: LogicalOperator;
  }) {
    const { field, operator, ...rest } = options;

    this.queryStrings.setState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [operator]: { ...rest },
      },
    }));
  }

  private addQueryString1<TFilterMap extends RowFilterMap<TRowMap>>(
    logicalOperator: keyof TFilterMap,
    [key, data]: Entry<RowFilterMapValue<TRowMap>>
  ) {
    if (this.isRowFilterFieldMap(key, data)) {
      this.queryStrings1.setState((prev) =>
        deepMerge(prev, {
          [String(logicalOperator)]: {
            [key]: {
              value: '',
              operator: data.operator,
            },
          },
        })
      );
    }

    if (isLogicalOperator(key)) {
      // this.queryStrings1.setState(prev=>deepMerge(prev, {[key]: this.addQueryString1()}))
    }
  }

  private applyQueryStringTransformer<
    TFilterMapValue extends RowFilterMapValue<TRowMap>,
    TFilterMap extends RowFilterMap<TRowMap>,
  >(
    filterMap: RowFilterMapValue<TRowMap>,
    filterEntries: Entries<RowFilterMapValue<TRowMap>>,
    queryStringTransformer:
      | QueryStringTransformer<TRowMap, TFilterMap>
      | undefined
    // callback: <TKey extends keyof TFilterMapValue>(
    //   options: TFilterMapValue[TKey] & { key: TKey }
    // ) => RowFilterMapValue<TRowMap>
  ) {
    if (!queryStringTransformer) {
      return undefined;
    }

    const allOperators = this.getFilterMapOperators<TFilterMap>(filterMap);
    const transformed = { ...filterMap };

    for (const [key, data] of filterEntries) {
      const field = String(key);

      if (this.isRowFilterFieldMap(field, data) && data) {
        const { operator } = data;
        const operators = allOperators[field as keyof typeof allOperators];
        const transformedStrings = queryStringTransformer?.[
          field as FilterMapFields<TRowMap, TFilterMap>
        ]?.({
          field: field as any,
          operators: operators as any,
          queryStrings: {} as any,
        });
        const transformedString =
          transformedStrings?.[operator as keyof typeof transformedStrings];
        const curr = transformed[key];

        if (this.isRowFilterFieldMap(key, curr)) {
          curr.value = (transformedString ?? '') as any;
        }
      }

      if (isLogicalOperator(key)) {
        const t = this.applyQueryStringTransformer(
          data as RowFilterFieldMap<TRowMap>,
          filterEntries,
          queryStringTransformer
        );

        console.log(t);
      }
    }

    return transformed;
  }

  private createQueryString<TFilterMap extends RowFilterMap<TRowMap>>(
    filterMapValue: RowFilterMapValue<TRowMap>,
    options: Omit<CreateFilterOptions1<TRowMap, TFilterMap>, 'filterMap'> & {
      logicalOperator?: keyof TFilterMap;
      filterMap: TFilterMap;
    }
  ) {
    const allOperators = this.getFilterMapOperators<TFilterMap>(filterMapValue);
    const filterEntries = entries(filterMapValue);
    const {
      logicalOperator,
      customSymbols: symbols,
      includeParenthesis,
      queryStringTransformer,
      filterMap,
    } = options;
    const transformedQueryStrings = {} as Record<keyof TRowMap, unknown>;
    let filterMapTransformed = deepAddProperties(filterMap, {
      additionalProperties: { queryString: '' },
      skipMergeIfKeysPresent: [String(logicalOperator)],
    });
    let queryString = '';
    let index = 0;
    let transformed = { ...filterMapValue };

    // this.applyQueryStringTransformer(
    //   filterMapValue,
    //   filterEntries,
    //   queryStringTransformer
    // );

    // this.queryStrings1.setState(() => filterMapValue);

    for (const [key, data] of filterEntries) {
      const field = String(key);

      if (this.isRowFilterFieldMap(key, data)) {
        const { operator, value } = data;
        const symbol =
          symbols?.globals?.[
            operator as keyof TRowMap[keyof TRowMap]['rules']
          ] ??
          symbols?.rowSpecific?.[field]?.[
            operator as keyof TRowMap[keyof TRowMap]['rules']
          ];

        if (!(key in this.rowMap)) {
          throw this.detailedError.error(
            `"${field}" is not a valid row key. The row keys are ${this.listFormatter.format(Object.keys(this.rowMap))}`
          );
        }

        if (typeof operator !== 'string') {
          throw this.detailedError.error(
            `Operator "${String(operator)}" must be  "string"`
          );
        }

        if (!isValidOperator(this.rowMap[key]['type'], operator)) {
          throw this.detailedError.error(
            `Operator "${operator}" is not valid for ${field}. Valid operators are: ${this.listFormatter.format(Object.keys(this.rowMap[key]['rules']))}`
          );
        }

        // check if there's a query transformer
        const operators = allOperators[field as keyof typeof allOperators];
        const transformedStrings = queryStringTransformer?.[
          field as FilterMapFields<TRowMap, TFilterMap>
        ]?.({
          field: field as any,
          operators: operators as any,
          queryStrings: {} as any,
        });
        const transformedString =
          transformedStrings?.[operator as keyof typeof transformedStrings];

        // if (transformedString && logicalOperator) {
        //   transformed[key].value = transformedString;
        //   deepReplace(filterMapValue, (curr) => {
        //     if (curr.key === key && curr.operator === operator) {
        //       return { ...curr, value: someNewValue };
        //     }
        //     return curr;
        //   });
        // }

        if (operator === 'between') {
          if (!Array.isArray(value)) {
            throw this.detailedError.error(
              'Operator "between" requires a tuple of values for the `value` prop ([value1, value2])'
            );
          }

          const [value1, value2] = value;

          this.addQueryString({
            field,
            operator,
            value: `${symbol ?? 'is between'} '${value1}' and '${value2}'`,
            order: `${index}.${0}`,
          });

          queryString += `${field} ${symbol ?? 'is between'} '${value1}' and '${value2}'`;
          this.queryStrings1.setState((prev) => ({
            ...prev,
            [String(logicalOperator)]: {
              [field]: {
                operator,
                value,
                queryString: `${symbol ?? 'is between'} '${value1}' and '${value2}'`,
              },
            },
          }));

          // TODO create function that will take in: some data (T), a search for object (which would find the matching **deep** object based on "best match"), and some new data that should be added to that object
          // examples:
          //  deepAdd(filterMapTransformed, {[field]: {operator, value}}, {queryString: 'some string here'})

          if (logicalOperator && logicalOperator in filterMapTransformed) {
            const logicalOperatorKey =
              logicalOperator as keyof typeof filterMapTransformed;
            const fieldKey =
              field as keyof (typeof filterMapTransformed)[typeof logicalOperatorKey];
            filterMapTransformed[logicalOperatorKey][fieldKey].queryString =
              `${symbol ?? 'is between'} '${value1}' and '${value2}'`;
          } else {
          }
        } else if (isEmptyOperator(operator)) {
          this.addQueryString({
            field,
            operator,
            value: `${symbol ?? operator}'`,
            order: `${index}.${0}`,
          });
          queryString += `${field} ${symbol ?? operator}`;
          this.queryStrings1.setState((prev) => ({
            ...prev,
            [String(logicalOperator)]: {
              [field]: {
                operator,
                value,
                queryString: `${field} ${symbol ?? operator}`,
              },
            },
          }));
        } else {
          this.addQueryString({
            field,
            operator,
            value: `${symbol ?? operator} '${value}'`,
            order: `${index}.${0}`,
          });
          queryString += `${field} ${symbol ?? operator} '${value}'`;
          this.queryStrings1.setState((prev) => ({
            ...prev,
            [String(logicalOperator)]: {
              [field]: {
                operator,
                value,
                queryString: `${field} ${symbol ?? operator} '${value}'`,
              },
            },
          }));
        }

        // Append the logical operator when we're not on the last filter
        if (
          !isLogicalOperator(filterEntries[index + 1]?.[0]) &&
          logicalOperator
        ) {
          const op =
            symbols?.logicalOperators?.[logicalOperator as LogicalOperator] ??
            String(logicalOperator).toUpperCase();

          queryString += ` ${op} `;
        }

        // if (transformedStrings && Object.keys(transformedStrings).length > 0) {
        //   this.queryStrings1.setState((prev) =>
        //     deepMerge(prev, {
        //       [String(logicalOperator)]: {
        //         [key]: {
        //           value:
        //             transformedStrings?.[
        //               operator as keyof typeof transformedStringsoperator as keyof typeof transformedStrings
        //             ],
        //           operator,
        //         },
        //       },
        //     })
        //   );
        // }
      }

      if (isLogicalOperator(key)) {
        const { logicalOperator, ...rest } = options;
        const op = symbols?.logicalOperators?.[key] ?? key.toUpperCase();
        const newQueryString = this.createQueryString(
          data as RowFilterFieldMap<TRowMap>,
          {
            logicalOperator: key,
            ...rest,
          }
        );

        queryString = `(${queryString})`;
        queryString += ` (${op} ${newQueryString.queryString})`;

        const endingString = ` ${op} )`;
        if (queryString.endsWith(endingString)) {
          queryString = queryString.replace(endingString, ')');
        }
        queryString = `(${queryString})`;
      }

      // const t = this.queryStrings1.state;

      // transformedQueryStrings[field as keyof TRowMap] = transformedStrings;

      // if (transformedStrings) {
      //   const transformed = entries(transformedStrings).map(
      //     ([field, values]) => {
      //       if (queryString.includes(String(field))) {
      //         return queryString.replace(`{${String(field)}}`, String(values));
      //       }

      //       return queryString;
      //     }
      //   );
      //   const news = entries(transformedStrings).reduce(
      //     (acc, [field, values]) => {
      //       const e = entries(values!);
      //       return acc;
      //     },
      //     queryString
      //   );
      //   debugger;
      // }

      index++;
    }

    if (includeParenthesis === false) {
      // Remove all parenthesis
      queryString = queryString.replaceAll('(', '').replaceAll(')', '');
    }

    const s = transformedQueryStrings;
    // const t = queryStrings.state;

    // queryStrings.setState((prev) => deepMerge(s, prev));

    // const t1 = queryStrings.state;
    return {
      queryString,
      queryStrings: this.queryStrings.state,
      qs: this.queryStrings1.state,
    };
  }

  public createFilter<TFilterMap extends RowFilterMap<TRowMap>>(
    options: CreateFilterOptions1<TRowMap, TFilterMap>
  ) {
    const { filterMap, ...rest } = options;
    const keys = Object.keys(filterMap);

    this.detailedError.setSpecificMethod('createFilter');

    if (keys.length > 1) {
      throw this.detailedError.error(
        `Found 2 keys (${this.listFormatter.format(keys)}), please remove one. Note: in a future version, this will be taken care of.`
      );
    }

    const [logicalOperator, rowFilterMapValue] = entries(filterMap)[0];
    console.log({
      filterMap,
      constructedMap: { [logicalOperator]: rowFilterMapValue },
    });

    if (typeof logicalOperator !== 'string') {
      throw this.detailedError.error(
        `The key "${String(logicalOperator)}" must be a string. It is currently a ${typeof logicalOperator}`
      );
    }

    if (!isLogicalOperator(logicalOperator)) {
      throw this.detailedError.error(
        `The key "${String(logicalOperator)}" must either be ${this.listFormatter.format(Object.keys(logicalOperators.Values))}`
      );
    }

    if (typeof rowFilterMapValue !== 'object') {
      throw this.detailedError.error(
        `The value for "${logicalOperator}" must be an object`
      );
    }

    const { queryString, queryStrings, qs } = this.createQueryString(
      rowFilterMapValue as RowFilterMapValue<TRowMap>,
      {
        logicalOperator,
        filterMap,
        ...rest,
      }
    );

    console.log({ qs });

    // const queryString = entries(filterMap)
    //   .map(([logicalOperator, rowFilterMapValue]) => {
    //     if (typeof logicalOperator !== 'string') {
    //       throw this.detailedError.error(
    //         `The key "${String(logicalOperator)}" must be a string. It is currently a ${typeof logicalOperator}`
    //       );
    //     }

    //     if (!isLogicalOperator(logicalOperator)) {
    //       throw this.detailedError.error(
    //         `The key "${String(logicalOperator)}" must either be ${this.listFormatter.format(Object.keys(logicalOperators.Values))}`
    //       );
    //     }

    //     if (typeof rowFilterMapValue !== 'object') {
    //       throw this.detailedError.error(
    //         `The value for "${logicalOperator}" must be an object`
    //       );
    //     }

    //     return this.createQueryString(
    //       rowFilterMapValue as RowFilterMapValue<TRowMap>,
    //       { logicalOperator, ...rest }
    //     );
    //   })
    //   .join('');

    return { filters: filterMap, queryString };
  }
}
