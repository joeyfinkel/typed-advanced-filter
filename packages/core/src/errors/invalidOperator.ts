export class InvalidOperatorError<TKey extends string> extends Error {
  key: TKey;

  constructor(key: TKey, message: string) {
    super(`[${key}]: ${message}`);
    this.key = key;

    Object.setPrototypeOf(this, InvalidOperatorError.prototype);
  }
}
