/**
 * Checks if a value is a plain object (e.g., created via {} or new Object()).
 * Excludes arrays, null, and class instances.
 * @param value - The value to check.
 * @returns True if the value is a plain object, false otherwise.
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Helper type to check if an object T has any keys that are also in K */
type HasKeyFrom<T, K extends ReadonlyArray<PropertyKey>> = keyof T &
  K[number] extends never
  ? false
  : true;

/**
 * Recursive Mapped Type: Defines the structure of T after conditionally merging U
 * into nested objects based on the presence of keys from K.
 */
type DeepMergeConditional<T, U, K extends ReadonlyArray<PropertyKey>> =
  // Check if T is structurally like a plain object (indexable)
  T extends Record<string | number | symbol, any>
    ? // Check if T itself is a plain object (runtime check approximation)
      // We primarily rely on the runtime isPlainObject, this helps typing
      T extends ReadonlyArray<any> // Exclude arrays explicitly
      ? T // Return arrays as-is
      : HasKeyFrom<T, K> extends true // Does the *current* object T have a skip key?
        ? // Yes: Skip merge for this object, just recurse on its properties
          { [P in keyof T]: DeepMergeConditional<T[P], U, K> }
        : // No: Merge U into this object and recurse on its properties
          { [P in keyof T]: DeepMergeConditional<T[P], U, K> } & U
    : // Not an object-like structure (primitive, function, etc.), return as is
      T;

export function deepAddProperties<
  T extends object,
  U extends object,
  K extends ReadonlyArray<string | number | symbol> = [],
>(
  data: T,
  options: {
    additionalProperties: U;
    skipMergeIfKeysPresent?: K;
  }
): DeepMergeConditional<T, U, K> {
  const skipKeysSet = new Set(options.skipMergeIfKeysPresent ?? []);
  const additionalProps = options.additionalProperties;

  function deepProcess(currentData: any): any {
    // Base case 1: Not an object or is null, return directly
    if (typeof currentData !== 'object' || currentData === null) {
      return currentData;
    }

    // Base case 2: Handle arrays - process elements recursively but don't merge props
    if (Array.isArray(currentData)) {
      // Important: Create a new array
      return currentData.map((item) => deepProcess(item));
    }

    // Base case 3: Not a plain object (e.g., Date, RegExp), return as is
    if (!isPlainObject(currentData)) {
      return currentData;
    }

    // --- Process Plain Object ---

    // Process children first recursively into a new object
    const processedChildren: Record<string, any> = {};
    for (const key in currentData) {
      if (Object.prototype.hasOwnProperty.call(currentData, key)) {
        processedChildren[key] = deepProcess(currentData[key]); // Recurse
      }
    }

    // Check if the *original* currentData contains any skip keys
    let shouldSkipMerge = false;
    if (skipKeysSet.size > 0) {
      for (const key in currentData) {
        if (
          Object.prototype.hasOwnProperty.call(currentData, key) &&
          skipKeysSet.has(key)
        ) {
          shouldSkipMerge = true;
          break;
        }
      }
    }

    // Return processed children, merging additionalProps only if not skipped
    if (shouldSkipMerge) {
      return processedChildren; // Return only the processed children
    } else {
      // Return processed children merged with additional properties
      return { ...processedChildren, ...additionalProps };
    }
  }

  // Start recursion. Assert type as TS struggles to verify against complex mapped types.
  return deepProcess(data) as DeepMergeConditional<T, U, K>;
}
