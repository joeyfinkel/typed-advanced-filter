
export class DetailedError<TClass, TKey extends string = string> {
  key: TKey;
  cls?: TClass;
  method: keyof TClass | undefined;

  constructor(key: TKey, cls?: TClass) {
    this.key = key;
    this.cls ??= cls;
  }

  generateKey() {
    return `${this.key}${this.method ? `#${String(this.method)}` : ''}`;
  }

  static error<TKey extends string>(key: TKey, message: string) {
    const detailedError = new DetailedError( key);

    return detailedError.error(`[${key}]: ${message}`);
  }

  error(message: string) {
    return new Error(`[${this.key}]: ${message}`);
  }

  setSpecificMethod<Key extends keyof TClass | (string & {})>(key: Key) {
    this.key = `${this.key}#${String(key)}` as TKey;
  }
}
