import { DetailedError } from '../errors/detailedError';
import { GetOperator, getOperators } from '../operators';
import { FilterTypes } from '../row';

/**
 * Helper type to exclude fields that are included
 */
export type ExcludeIncluded<TOmit, TInclude> = TOmit extends TInclude
  ? never
  : TOmit;

/**
 * Helper type to exclude fields that are omitted
 */
export type ExcludeOmitted<TInclude, TOmit> = TInclude extends TOmit
  ? never
  : TInclude;
export type OmitOrIncludeOptions<
  TFilterType extends FilterTypes,
  TOmit extends GetOperator<TFilterType> = never,
  TInclude extends GetOperator<TFilterType> = GetOperator<TFilterType>
> = {
  filterType: TFilterType;
  /**
   * An array of values to omit.
   */
  omit?: Array<ExcludeIncluded<TOmit, TInclude>>;
  /**
   * An array of values to include.
   */
  include?: Array<ExcludeOmitted<TInclude, TOmit>>;
};

export function getExclusive<
  TFilterType extends FilterTypes,
  TOperator extends GetOperator<TFilterType> = GetOperator<TFilterType>,
  TOmit extends TOperator = never,
  TInclude extends ExcludeOmitted<TOperator, TOmit> = ExcludeOmitted<
    TOperator,
    TOmit
  >
>(options: OmitOrIncludeOptions<TFilterType, TOmit, TInclude>) {
  const { filterType, include, omit } = options;

  if (!filterType) {
    throw new DetailedError('getExclusive', '`filterType` is required.');
  }

  const operators = new Set([...getOperators(filterType)]);
  const included = new Set([...(include ?? [])]);
  const omitted = new Set([...(omit ?? [])]);

  if (included.size > 0 && omitted.size >= 0) {
    const common = operators.intersection(included);

    return [...common] as Array<Extract<TOperator, TInclude>>;
  }

  if (included.size === 0 && omitted.size > 0) {
    const differences = operators.difference(omitted);

    return [...differences] as Array<Extract<TOperator, TInclude>>;
  }

  if (included.size === 0 && omitted.size === 0) {
    return [...operators];
  }

  const detailedErrorObj = {
    operators: [...operators].join(', '),
    included: [...included].join(', '),
    omitted: [...omitted].join(', '),
  };

  throw new DetailedError(
    'getExclusive',
    `An error occurred. Data: ${JSON.stringify(detailedErrorObj)}`
  );
}
