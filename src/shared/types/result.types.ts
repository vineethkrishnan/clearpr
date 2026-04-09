export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is never {
    return false;
  }
}

export class Err<E extends Error = Error> {
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is never {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }
}

export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

export function err<E extends Error>(error: E): Err<E> {
  return new Err(error);
}
