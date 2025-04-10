import {
  DetailedError,
  InvalidOperatorError,
  MakeOptional,
} from '@typed-advanced-filter/core';
import React, { useState } from 'react';
import { z } from 'zod';
import { AdvancedFilterOptions, AdvancedFilterOptionsProps, Option } from './options';

export type LogicalOperatorsOptions = z.infer<typeof logicalOperators>;
type LogicalOperatorsProps = MakeOptional<
  AdvancedFilterOptionsProps<LogicalOperatorsOptions>,
  'options'
>;

const logicalOperators = z.enum(['and', 'or']);

function validateLogicalOperators(options: Array<Option>) {
  const operators = logicalOperators._def.values;
  const values = options.flatMap(({ value }) => value);

  const operatorsSet = new Set(operators);
  const valuesSet = new Set(values);

  if (operatorsSet.size !== valuesSet.size) {
    throw new DetailedError(
      'LogicalOperators',
      'The given options have more elements than allowed'
    );
  }

  const hasTheValues = [...operatorsSet].every((value) => valuesSet.has(value));

  if (!hasTheValues) {
    throw new InvalidOperatorError(
      'LogicalOperators',
      "The given options don't have the proper values."
    );
  }
}
export function LogicalOperators(props: LogicalOperatorsProps) {
  const {
    options = [
      { value: 'and', text: 'And' },
      { value: 'or', text: 'Or' },
    ],
    value,
    onValueChange,
    ...rest
  } = props;
  const [logicalOperator, setLogicalOperator] =
    useState<LogicalOperatorsOptions>(value ?? 'and');

  validateLogicalOperators(options);

  return (
    <AdvancedFilterOptions
      value={logicalOperator}
      options={options}
      onValueChange={(value) => {
        setLogicalOperator(value);
        onValueChange?.(value);
      }}
      {...rest}
    />
  );
}
