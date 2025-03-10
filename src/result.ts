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
