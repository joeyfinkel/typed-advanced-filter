import { FilterOperatorMap } from './operators';
import { DeepKeys } from './utils';

export type FilterTypes = Exclude<
  DeepKeys<FilterOperatorMap>,
  `${string}.main`
>;
