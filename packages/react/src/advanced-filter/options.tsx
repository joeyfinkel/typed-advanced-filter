import * as React from 'react';
import { Fragment } from 'react/jsx-runtime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export type Option<TValue extends string = string> = {
  value: TValue;
  text: string;
};
export type AdvancedFilterOptionsProps<TValue extends string> = {
  placeholder?: string;
  name?: string;
  className?: string;
  value?: TValue;
  defaultValue?: TValue;
  showSeparator?: boolean;
  disabled?: boolean;
  options: Array<Option<TValue>>;
  onValueChange?: (value: TValue) => void;
};

export function AdvancedFilterOptions<TValue extends string>({
  options,
  placeholder,
  className,
  showSeparator,
  ...selectProps
}: AdvancedFilterOptionsProps<TValue>) {
  return (
    <Select {...selectProps}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(({ text, value }) => (
          <Fragment key={value}>
            {showSeparator && <SelectSeparator />}
            <SelectItem value={value}>{text}</SelectItem>
          </Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}
