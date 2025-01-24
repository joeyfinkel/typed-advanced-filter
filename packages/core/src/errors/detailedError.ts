export class DetailedError<TKey extends string> extends Error {
  key: TKey;

  constructor(key: TKey, message: string) {
    super(`[${key}]: ${message}`);

    this.key = key;

    Object.setPrototypeOf(this, DetailedError.prototype);
  }
}
