import {
  DetailedError,
  EnsureIs,
  FilterTypes,
  GetOperator,
  InvalidOperatorError,
} from '@typed-advanced-filter/core';
import {
  AdvancedFilterOptions,
  AdvancedFilterOptionsProps,
  Option,
} from './options';
import { z } from 'zod';
import React from 'react';
import { Input } from '../components/ui/input';

type ForOptions = (typeof forOptions)['Enum'];
type NarrowUnion<TUnion extends string, TPick extends TUnion> = TPick;
type BasicInputTypes = NarrowUnion<FilterTypes, 'string' | 'number'>;
type GetEnumValue<
  TEnum extends z.Values<[string, ...string[]]>,
  TValue extends keyof TEnum,
> = TValue;
type Shared<TFilterType extends FilterTypes, TData> = {
  type: TFilterType;
  onValueChange: (data: TData) => void;
};
type ItemPropsWithOptions<
  TFilterType extends FilterTypes,
  TValue extends string,
  TOptions extends Option<TValue>,
> = Shared<TFilterType, { value: TValue; type: TFilterType }> &
  Omit<AdvancedFilterOptionsProps<TValue>, 'options' | 'onValueChange'> & {
    options: Array<TOptions>;
  };
type ColumnItemProps<
  TFilterType extends FilterTypes,
  TValue extends string,
  TOptions extends Option<TValue>,
> = ItemPropsWithOptions<TFilterType, TValue, TOptions> & {
  for: GetEnumValue<ForOptions, 'column'>;
};
type OperatorItemProps<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType>,
  TOptions extends Option<TValue>,
> = ItemPropsWithOptions<TFilterType, TOptions['value'], TOptions> & {
  for: GetEnumValue<ForOptions, 'operator'>;
};
type BlankValueItemProps<
  TFilterType extends NarrowUnion<FilterTypes, 'empty'>,
> = {
  type: TFilterType;
  for: GetEnumValue<ForOptions, 'value'>;
  options?: never;
  placeholder?: never;
  onValueChange?: never;
};
type PopulateValueItemProps<TFilterType extends BasicInputTypes> = Shared<
  TFilterType,
  { value: string }
> & {
  for: GetEnumValue<ForOptions, 'value'>;
  placeholder?: string;
  options?: never;
};
type AdvancedFilterItemProps<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType>,
  TOptions extends Option<TValue>,
> =
  | ColumnItemProps<TFilterType, TValue, TOptions>
  | OperatorItemProps<TFilterType, TValue, TOptions>
  | PopulateValueItemProps<EnsureIs<TFilterType, BasicInputTypes>>
  | BlankValueItemProps<EnsureIs<TFilterType, 'empty'>>;

const forOptions = z.enum(['value', 'column', 'operator']);
const formatter = new Intl.ListFormat('en', {
  type: 'disjunction',
  style: 'long',
});
const formattedForOptions = formatter.format(forOptions._def.values);

function isValidForOption(
  value: string | undefined
): value is z.infer<typeof forOptions> {
  return forOptions.safeParse(value).success;
}

export function AdvancedFilterItem<
  TFilterType extends FilterTypes,
  TValue extends string,
  TOptions extends Option<TValue>,
>(props: ColumnItemProps<TFilterType, TValue, TOptions>): React.JSX.Element;
export function AdvancedFilterItem<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType>,
  TOptions extends Option<TValue>,
>(props: OperatorItemProps<TFilterType, TValue, TOptions>): React.JSX.Element;
export function AdvancedFilterItem<
  TFilterType extends NarrowUnion<FilterTypes, 'empty'>,
>(props: BlankValueItemProps<TFilterType>): React.JSX.Element;
export function AdvancedFilterItem<TFilterType extends BasicInputTypes>(
  props: PopulateValueItemProps<TFilterType>
): React.JSX.Element;
export function AdvancedFilterItem<
  TFilterType extends FilterTypes,
  TValue extends GetOperator<TFilterType>,
  TOptions extends Option<TValue>,
>(props: AdvancedFilterItemProps<TFilterType, TValue, TOptions>) {
  const { for: _for } = props;

  if (!_for) {
    throw new DetailedError(
      'AdvancedFilterItem',
      `The "for" prop is required. Available options are: ${formattedForOptions} `
    );
  }

  if (!isValidForOption(_for)) {
    throw new InvalidOperatorError(
      'AdvancedFilterItem',
      `"${props.for}" is not a valid option for the "for" prop. Available options are: ${formattedForOptions}`
    );
  }

  if (_for === 'value') {
    return (
      <Input
        className='w-full'
        placeholder={props.placeholder}
        type={props.type}
        onChange={(e) => {
          props.onValueChange?.({ value: e.target.value });
        }}
      />
    );
  }

  const { onValueChange, options, type, ...rest } = props;

  return (
    <AdvancedFilterOptions
      options={options}
      onValueChange={(value) => {
        onValueChange({ value, type });
      }}
      {...rest}
    />
  );
}
