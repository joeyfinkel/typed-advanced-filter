import { GetOperator } from './operators';
import { DateFilterTypes } from './row';
import { buildRule, buildRules, RuleMap, RuleSchema } from './rule';
import { RemovePrefix, typedEntries } from './utils';
import {
  ExcludeOmitted,
  getExclusive,
  OmitOrIncludeOptions,
} from './utils/getExclusive';

type CompactDateOptions = RemovePrefix<DateFilterTypes, 'date.'>;
export type CreateDateOptions<
  TFilterType extends CompactDateOptions,
  TOperator extends GetOperator<`date.${TFilterType}`>,
  TOmit extends TOperator = never,
  TInclude extends ExcludeOmitted<TOperator, TOmit> = ExcludeOmitted<
    TOperator,
    TOmit
  >,
  TRuleMap extends RuleMap<`date.${TFilterType}`, TInclude> = RuleMap<
    `date.${TFilterType}`,
    TInclude
  >
> = Omit<
  OmitOrIncludeOptions<`date.${TFilterType}`, TOmit, TInclude>,
  'filterType'
> & {
  filterType: TFilterType;
  rules?: TRuleMap;
};

export const weekdayOptions = buildRules({
  filterType: 'date.days.weekdays',
  rules: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
  },
});
export const weekendOptions = buildRules({
  filterType: 'date.days.weekends',
  rules: {
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
});
export const dayOfWeekOptions = [...weekendOptions, ...weekdayOptions];
export const basicDateOptions = buildRules({
  filterType: 'date.basic',
  rules: {
    'custom-date': {
      text: 'Custom date',
      renderSeparator: true,
    },
    'day-of-week': {
      text: 'Day',
      children: dayOfWeekOptions,
    },
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
  },
});

export const dateFilterOptions: {
  [Key in DateFilterTypes]: Array<RuleSchema<Key, GetOperator<Key>>>;
} = {
  'date.basic': basicDateOptions,
  'date.days': dayOfWeekOptions,
  'date.days.weekdays': weekdayOptions,
  'date.days.weekends': weekendOptions,
};

export function createDateOptions<
  TFilterType extends CompactDateOptions,
  TOperator extends GetOperator<`date.${TFilterType}`>,
  TOmit extends TOperator = never,
  TInclude extends ExcludeOmitted<TOperator, TOmit> = ExcludeOmitted<
    TOperator,
    TOmit
  >,
  TRuleMap extends RuleMap<`date.${TFilterType}`, TInclude> = RuleMap<
    `date.${TFilterType}`,
    TInclude
  >
>(
  options: CreateDateOptions<TFilterType, TOperator, TOmit, TInclude, TRuleMap>
) {
  const { filterType: filterTypeImpl, include, omit, rules } = options;
  const filterType = `date.${filterTypeImpl}` as const;
  const currentRules = dateFilterOptions[filterType];

  const exclusive = getExclusive({ filterType, include, omit });

  if (rules) {
    for (const [key, value] of typedEntries(rules)) {
      if (
        exclusive.includes(
          key as Extract<GetOperator<`date.${TFilterType}`>, TInclude>
        )
      ) {
        const index = currentRules.findIndex((rule) => rule.value === key);

        // Replace the current value with the new value
        if (index !== -1 && value) {
          currentRules[index] = buildRule({
            filterType,
            operator: key,
            schema: value,
          });
        }
      }
    }
  }

  return currentRules as Array<RuleSchema<`date.${TFilterType}`, TInclude>>;
}
