import { entries, FilterMap, RowMap, Rows } from '@typed-advanced-filter/core';
import React from 'react';
import { LogicalOperator } from './logical-operator';
import { AdvancedFilterRow } from './row';

export type AdvancedFilterProps<
  TRows extends RowMap,
  TKeys extends keyof TRows,
  TLogicalOperator extends LogicalOperator,
  TFilterMap extends FilterMap<TRows, TKeys, TLogicalOperator>,
> = {
  rows: Rows<TRows>;
  filters: TFilterMap;
};

export function AdvancedFilter<
  TRows extends RowMap,
  TKeys extends keyof TRows,
  TLogicalOperator extends LogicalOperator,
  TFilterMap extends FilterMap<TRows, TKeys, TLogicalOperator>,
>(props: AdvancedFilterProps<TRows, TKeys, TLogicalOperator, TFilterMap>) {
  const { filters, rows } = props;

  return (
    <>
      {entries(filters).map((filter, index) => {
        const [key, value] = filter;

        return (
          <AdvancedFilterRow
            filter={value}
            index={index}
            rows={rows}
            key={`${index}-${String(value.field)}`}
          />
        );
      })}
    </>
  );
}
