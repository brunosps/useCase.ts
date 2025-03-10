export type ResultProps<T> = {
  resultType: string;
  isSuccess: boolean;
  error?: Error;
  data?: T;
  context?: Record<string, any>;
  useCaseClass?: string;
};

export class Result<T> {
  readonly resultType: string;
  readonly data: T;
  readonly error: Error;
  readonly context: Record<string, any>;
  readonly useCaseClass: string;

  private readonly _isSuccess: boolean;

  constructor({ resultType, isSuccess, error, data, context, useCaseClass }: ResultProps<T>) {
    this.resultType = resultType;
    this._isSuccess = isSuccess;
    this.data = (data ?? {}) as T;
    this.error = error ?? ({} as Error);
    this.useCaseClass = useCaseClass ?? '';
    this.context = context ?? {};
  }

  getValue(): T {
    return this.data;
  }

  isSuccess(): boolean {
    return this._isSuccess;
  }

  isFailure(): boolean {
    return !this._isSuccess;
  }

  getType(): string {
    return this.resultType;
  }

  getError(): Error {
    return this.error;
  }

  /**
   * Executes the next use case only if the current result is successful.
   * Similar to Promise.then(), this method allows for chaining use cases.
   *
   * @param fn Function to execute if the current result is successful
   * @returns A new Result containing the outcome of the function or the original failure
   */
  async and_then<U>(
    fn: (data: T, res: Result<T>) => Promise<Result<U>> | Result<U>,
  ): Promise<Result<U>> {
    if (this.isFailure()) {
      return Failure<U>(this.error, this.resultType, this.context, this.useCaseClass);
    }

    try {
      const result = await fn(this.getValue(), this);
      return this.mergeContext<U>(result, this);
    } catch (error) {
      return Failure<U>(
        error instanceof Error ? error : new Error(String(error)),
        'UNEXPECTED_ERROR',
        { ...this.context, rawError: error },
        this.useCaseClass,
      );
    }
  }

  /**
   * @deprecated Use and_then() instead
   */
  async execUseCase<U>(fn: (data: T, res: Result<T>) => Promise<Result<U>>): Promise<Result<U>> {
    return this.and_then(fn);
  }

  private mergeContext<U>(result: Result<U>, mergeable: Result<T>): Result<U> {
    return new Result<U>({
      resultType: result.resultType,
      isSuccess: result._isSuccess,
      error: result.error,
      data: result.data,
      useCaseClass: result.useCaseClass,
      context: { ...mergeable.context, ...result.context },
    });
  }

  onSuccess(f: (data: T, res: Result<T>) => void): Result<T> {
    if (this._isSuccess) {
      f(this.getValue(), this);
    }

    return this;
  }

  onFailure(f: (error: Error, res: Result<T>) => void, failureType = 'FAILURE'): Result<T> {
    if (this.isFailure() && this.resultType === failureType) {
      f(this.getError(), this);
    }

    return this;
  }
}

/**
 * A class that wraps a Promise<Result<T>> and provides methods for chaining operations.
 * This allows for a more fluent API similar to Promise chaining.
 */
export class ResultPromise<T> implements PromiseLike<Result<T>> {
  private promise: Promise<Result<T>>;

  constructor(promise: Promise<Result<T>>) {
    this.promise = promise;
  }

  /**
   * Implementation of the PromiseLike interface.
   */
  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  /**
   * Chains a function to be called if the Result is successful.
   * Similar to Result.and_then() but works on the Promise level.
   *
   * @param fn Function to execute if the Result is successful
   * @returns A new ResultPromise
   */
  and_then<U>(
    fn: (value: T, result: Result<T>) => Promise<Result<U>> | Result<U>,
  ): ResultPromise<U> {
    const newPromise = this.promise.then(result => {
      return result.and_then(fn);
    });

    return new ResultPromise(newPromise);
  }

  /**
   * Registers a callback to be executed if the Result is successful.
   *
   * @param f Callback function
   * @returns This ResultPromise for chaining
   */
  onSuccess(f: (data: T, res: Result<T>) => void): ResultPromise<T> {
    this.promise.then(result => {
      result.onSuccess(f);
    });
    return this;
  }

  /**
   * Registers a callback to be executed if the Result is a failure of the specified type.
   *
   * @param f Callback function
   * @param failureType Optional failure type to match
   * @returns This ResultPromise for chaining
   */
  onFailure(f: (error: Error, res: Result<T>) => void, failureType = 'FAILURE'): ResultPromise<T> {
    this.promise.then(result => {
      result.onFailure(f, failureType);
    });
    return this;
  }

  /**
   * Awaits the promise and returns the Result.
   *
   * @returns The Result
   */
  async toResult(): Promise<Result<T>> {
    return await this.promise;
  }
}

export const Success = <U>(
  value?: U,
  context?: Record<string, any>,
  useCaseClass?: string,
): Result<U> => {
  return new Result<U>({
    resultType: 'SUCCESS',
    isSuccess: true,
    data: value,
    context,
    useCaseClass,
  });
};

export const Failure = <U>(
  error: Error,
  failureType = 'FAILURE',
  context?: Record<string, any>,
  useCaseClass?: string,
): Result<U> => {
  return new Result<U>({
    resultType: failureType,
    isSuccess: false,
    error,
    context,
    useCaseClass,
  });
};
