import {
  GetOperator,
  getOperators,
  isValidOperator
} from './operators';
import { FilterTypes } from './row';
import { removeKeys, typedEntries } from './utils';

export type BaseRuleOptions<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType>,
  TOptionalValue extends boolean
> = {
  text: string;
  /**
   * If `true`, a separator will be rendered before the rule.
   */
  renderSeparator?: boolean;
  /**
   * The type of the rule.
   */
  type?: Exclude<FilterTypes, `date.${string}`> | 'empty';
  /**
   * Nested rules.
   */
  children?: Array<NoInfer<RuleSchema<TFilterType, TValue, TOptionalValue>>>;
  /**
   * Sibling rules.
   */
  siblings?: Array<NoInfer<RuleSchema<TFilterType, TValue, TOptionalValue>>>;
};
export type RuleSchema<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>,
  TOptionalValue extends boolean = true
> = BaseRuleOptions<TFilterType, TOperator, TOptionalValue> &
  (TOptionalValue extends true ? { value?: TOperator } : { value: TOperator });
export type Rule<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType> = GetOperator<TFilterType>,
  TOptionalValue extends boolean = true
> = string | RuleSchema<TFilterType, TValue, TOptionalValue>;
// export type RuleBuilderFn<
//   TFilterType extends FilterTypes,
//   TOperator extends GetOperator<TFilterType>
// > = {
//   <TRule extends string>(schema: TRule): { value: TOperator; text: string };
//   <TRule extends RuleSchema<TFilterType, TOperator>>(schema: TRule): TRule;
// };
export type RuleMap<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>
> = {
  [Op in TOperator]?: Rule<TFilterType, TOperator>;
  // | RuleBuilderFn<TFilterType, TOperator>;
};
type BuildRuleOptions<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>,
  TRule extends Rule<TFilterType, TOperator>
> = {
  filterType: TFilterType;
  operator: TOperator;
  schema: TRule;
};

export function isRuleSchema<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>
>(value: unknown): value is RuleSchema<TFilterType, TOperator> {
  if (typeof value === 'object' && value) {
    // Check for the only required property.
    if ('text' in value) {
      return true;
    }

    // Check for optional properties.
    if (
      'value' in value ||
      'renderSeparator' in value ||
      'type' in value ||
      'children' in value ||
      'siblings' in value
    ) {
      return true;
    }
  }

  return false;
}

export function buildRule<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>,
  TRule extends Rule<TFilterType, TOperator>
>(
  options: BuildRuleOptions<TFilterType, TOperator, TRule>
): RuleSchema<TFilterType, TOperator> {
  const { filterType, operator, schema } = options;

  if (typeof schema === 'string') {
    return { value: operator, text: schema };
  }

  if (typeof schema === 'object') {
    const { value: inferredValue, text, ...rest } = schema;
    const value = inferredValue ?? operator;

    return isRuleSchema(rest)
      ? ({ value, ...rest } as RuleSchema<TFilterType, TOperator>)
      : { value, text: value };
  }

  throw new Error(
    `[buildRule]: Invalid schema for ${filterType}: ${typeof schema}. Must be a string or an object.`
  );
}

export type BuildRulesOptions<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>,
  TRulesMap extends RuleMap<TFilterType, TOperator>
> = {
  filterType: TFilterType;
  rules: TRulesMap;
  /**
   * A function that allows you to transform the operators before they are built.
   */
  transformer?: (operators: Array<keyof TRulesMap>) => Array<keyof TRulesMap>;
};
export function buildRules<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType>,
  TRulesMap extends RuleMap<TFilterType, TOperator>
>(options: BuildRulesOptions<TFilterType, TOperator, TRulesMap>) {
  const { filterType, rules, transformer } = options;
  let rulesMap = rules;

  const keys = Object.keys(rulesMap) as Array<keyof TRulesMap>;
  const transformedKeys = transformer ? transformer(keys) : keys;

  if (transformedKeys.length > 0) {
    const removedKeys = keys.filter((key) => !transformedKeys.includes(key));

    rulesMap = removeKeys(rulesMap, removedKeys);
  }

  const entries = typedEntries(rulesMap);

  return entries.map(([key, value]) => {
    if (!isValidOperator(filterType, key)) {
      const mainMessage = `[buildRules]: Operator "${key}". is not valid for row type of "${filterType}"`;
      const validOperators = getOperators(filterType);

      if (validOperators) {
        throw new Error(
          `${mainMessage}. Valid operators are: ${validOperators.join(', ')}.`
        );
      }

      throw new Error(`${mainMessage}.`);
    }

    if (!value) {
      throw new Error(`[buildRules]: Row value not found for ${key}.`);
    }

    return buildRule({
      filterType,
      operator: key as TOperator,
      schema: value,
    });
  });
}
