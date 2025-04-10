import {
  FilterMap,
  LogicalOperator,
  RowMap,
  Rows,
  typedEntries,
} from '@typed-advanced-filter/core';
import React, { ComponentProps, useState } from 'react';
import { cn } from '../lib/utils';
import { AdvancedFilterItem } from './item';
import { LogicalOperators } from './logical-operator';
import { Option } from './options';

export type AdvancedFilterRowProps<
  TRowMap extends RowMap,
  TLogicalOperator extends LogicalOperator,
> = {
  index: number;
  rows: Rows<TRowMap>;
  filter: FilterMap<TRowMap, keyof TRowMap, TLogicalOperator>;
};

function DescriptiveText({
  className,
  children,
  ...rest
}: ComponentProps<'span'>) {
  return (
    <span className={cn('min-w-20', className)} {...rest}>
      {children ?? 'Where'}
    </span>
  );
}

export function AdvancedFilterRow<
  TRowMap extends RowMap,
  TLogicalOperator extends LogicalOperator,
>(props: AdvancedFilterRowProps<TRowMap, TLogicalOperator>) {
  const { index, rows, filter: filterMap } = props;
  console.log(props);
  const filters = typedEntries(filterMap);
  const [logicalOperator, filter] = filters[0];
  const rowKeys = rows.map(
    ({ value, text }) =>
      ({ value, text }) as Option<
        keyof TRowMap extends string ? keyof TRowMap : never
      >
  );

  const [selectedRow, setSelectedRow] = useState(
    rows.find(({ value }) => filter && value in filter) ?? rows[0]
  );

  return (
    <div className='flex gap-x-2 items-center justify-between'>
      {index === 0 ? (
        <DescriptiveText />
      ) : (
        <LogicalOperators value={logicalOperator} />
      )}

      <AdvancedFilterItem
        for='column'
        value={selectedRow.value.toString()}
        type={selectedRow.type}
        options={rowKeys}
        onValueChange={(data) => {
          const row = rows.find(({ value }) => value === data.value);

          if (row) {
            setSelectedRow(row);
          }
        }}
      />

      {/* <AdvancedFilterItem for='operator' /> */}
    </div>
  );
}
