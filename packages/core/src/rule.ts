import { GetOperator } from './operators';
import { FilterTypes } from './row';

export type BaseRuleOptions = {
  renderSeparator?: boolean;
  type: Exclude<FilterTypes, `date.${string}`> | 'empty';
};
export type RuleSchema<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType> = GetOperator<TFilterType>,
  TOptionalValue extends boolean = true
> = {};
