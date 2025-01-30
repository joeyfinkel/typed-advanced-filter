import { GetOperator } from './operators';
import { DateFilterTypes, FilterTypes } from './row';
import {
  buildRule,
  buildRules,
  isRule,
  Rule,
  RuleMap,
  RuleSchema,
} from './rule';
import { typedEntries } from './utils';
import {
  ExcludeOmitted,
  getExclusive,
  OmitOrIncludeOptions,
} from './utils/getExclusive';

export type CreateDateOptions<
  TFilterType extends DateFilterTypes,
  TOperator extends GetOperator<TFilterType>,
  TOmit extends TOperator = never,
  TInclude extends ExcludeOmitted<TOperator, TOmit> = ExcludeOmitted<
    TOperator,
    TOmit
  >,
  TRuleMap extends RuleMap<TFilterType, TInclude> = RuleMap<
    TFilterType,
    TInclude
  >
> = OmitOrIncludeOptions<TFilterType, TOmit, TInclude> & {
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

export const filterMap: {
  [Key in DateFilterTypes]: Array<RuleSchema<Key, GetOperator<Key>>>;
} = {
  'date.basic': basicDateOptions,
  'date.days': dayOfWeekOptions,
  'date.days.weekdays': weekdayOptions,
  'date.days.weekends': weekendOptions,
};

export function createDateOptions<
  TFilterType extends DateFilterTypes,
  TOperator extends GetOperator<TFilterType>,
  TOmit extends TOperator = never,
  TInclude extends ExcludeOmitted<TOperator, TOmit> = ExcludeOmitted<
    TOperator,
    TOmit
  >,
  TRuleMap extends RuleMap<TFilterType, TInclude> = RuleMap<
    TFilterType,
    TInclude
  >
>(
  options: CreateDateOptions<TFilterType, TOperator, TOmit, TInclude, TRuleMap>
) {
  const { filterType, include, omit, rules } = options;
  const currentRules = filterMap[filterType];

  const exclusive = getExclusive({ filterType, include, omit });

  if (rules) {
    for (const [key, value] of typedEntries(rules)) {
      if (
        exclusive.includes(key as Extract<GetOperator<TFilterType>, TInclude>)
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

  return currentRules as Array<RuleSchema<TFilterType, TInclude>>;
}

const options = createDateOptions({
  filterType: 'date.days.weekends',
  omit: ['saturday'],
  rules: {
    sunday: {
      text: 'Sunday',
      type: 'boolean',
    },
  },
});
