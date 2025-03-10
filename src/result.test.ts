import { Result, Success, Failure, ResultPromise } from './result';

describe('Result Class', () => {
  describe('constructor', () => {
    it('should create a successful result', () => {
      const result = new Result({
        resultType: 'SUCCESS',
        isSuccess: true,
        data: { value: 'test' },
      });

      expect(result.isSuccess()).toEqual(true);
      expect(result.isFailure()).toEqual(false);
      expect(result.getValue()).toEqual({ value: 'test' });
      expect(result.getType()).toEqual('SUCCESS');
    });

    it('should create a failure result', () => {
      const error = new Error('Test error');
      const result = new Result({
        resultType: 'FAILURE',
        isSuccess: false,
        error,
      });

      expect(result.isSuccess()).toEqual(false);
      expect(result.isFailure()).toEqual(true);
      expect(result.getError()).toEqual(error);
      expect(result.getType()).toEqual('FAILURE');
    });

    it('should handle missing optional properties', () => {
      const result = new Result({
        resultType: 'SUCCESS',
        isSuccess: true,
      });

      expect(result.data).toEqual({});
      expect(result.error).toEqual({} as Error);
      expect(result.useCaseClass).toEqual('');
      expect(result.context).toEqual({});
    });

    it('should set context and useCaseClass when provided', () => {
      const context = { someContext: 'value' };
      const result = new Result({
        resultType: 'SUCCESS',
        isSuccess: true,
        context,
        useCaseClass: 'TestUseCase',
      });

      expect(result.context).toEqual(context);
      expect(result.useCaseClass).toEqual('TestUseCase');
    });
  });

  describe('Success function', () => {
    it('should create a successful result', () => {
      const data = { value: 'test' };
      const result = Success(data);

      expect(result.isSuccess()).toEqual(true);
      expect(result.getValue()).toEqual(data);
      expect(result.getType()).toEqual('SUCCESS');
    });

    it('should include context and useCaseClass when provided', () => {
      const context = { someContext: 'value' };
      const result = Success({ value: 'test' }, context, 'TestUseCase');

      expect(result.context).toEqual(context);
      expect(result.useCaseClass).toEqual('TestUseCase');
    });

    it('should handle undefined data', () => {
      const result = Success();

      expect(result.isSuccess()).toEqual(true);
      expect(result.getValue()).toEqual({});
    });
  });

  describe('Failure function', () => {
    it('should create a failure result', () => {
      const error = new Error('Test error');
      const result = Failure(error);

      expect(result.isFailure()).toEqual(true);
      expect(result.getError()).toEqual(error);
      expect(result.getType()).toEqual('FAILURE');
    });

    it('should use custom failure type when provided', () => {
      const error = new Error('Test error');
      const result = Failure(error, 'CUSTOM_FAILURE');

      expect(result.getType()).toEqual('CUSTOM_FAILURE');
    });

    it('should include context and useCaseClass when provided', () => {
      const error = new Error('Test error');
      const context = { someContext: 'value' };
      const result = Failure(error, 'FAILURE', context, 'TestUseCase');

      expect(result.context).toEqual(context);
      expect(result.useCaseClass).toEqual('TestUseCase');
    });
  });

  describe('and_then method', () => {
    it('should execute the callback when result is successful', async () => {
      const initialResult = Success({ value: 'initial' });
      const nextResult = Success({ value: 'next' });
      const callback = jest.fn().mockResolvedValue(nextResult);

      const result = await initialResult.and_then(callback);

      expect(callback).toHaveBeenCalledWith({ value: 'initial' }, initialResult);
      expect(result).toEqual(nextResult);
    });

    it('should not execute the callback when result is a failure', async () => {
      const error = new Error('Test error');
      const initialResult = Failure(error);
      const callback = jest.fn();

      const result = await initialResult.and_then(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(result.isFailure()).toEqual(true);
      expect(result.getError()).toEqual(error);
    });

    it('should merge context from previous result', async () => {
      const initialResult = Success(
        { value: 'initial' },
        { initialContext: 'value' },
        'InitialUseCase',
      );
      const nextResult = Success({ value: 'next' }, { nextContext: 'value' }, 'NextUseCase');
      const callback = jest.fn().mockResolvedValue(nextResult);

      const result = await initialResult.and_then(callback);

      expect(result.context).toEqual({
        initialContext: 'value',
        nextContext: 'value',
      });
    });

    it('should handle synchronous callbacks', async () => {
      const initialResult = Success({ value: 'initial' });
      const nextResult = Success({ value: 'next' });
      const callback = jest.fn().mockReturnValue(nextResult);

      const result = await initialResult.and_then(callback);

      expect(callback).toHaveBeenCalled();
      expect(result).toEqual(nextResult);
    });

    it('should handle errors thrown in callback', async () => {
      const initialResult = Success({ value: 'initial' });
      const error = new Error('Callback error');
      const callback = jest.fn().mockImplementation(() => {
        throw error;
      });

      const result = await initialResult.and_then(callback);

      expect(callback).toHaveBeenCalled();
      expect(result.isFailure()).toEqual(true);
      expect(result.getError()).toEqual(error);
      expect(result.getType()).toEqual('UNEXPECTED_ERROR');
      expect(result.context).toHaveProperty('rawError', error);
    });

    it('should handle non-Error objects thrown in callback', async () => {
      const initialResult = Success({ value: 'initial' });
      const callback = jest.fn().mockImplementation(() => {
        throw 'string error';
      });

      const result = await initialResult.and_then(callback);

      expect(callback).toHaveBeenCalled();
      expect(result.isFailure()).toEqual(true);
      expect(result.getError().message).toEqual('string error');
      expect(result.getType()).toEqual('UNEXPECTED_ERROR');
    });
  });

  describe('execUseCase method', () => {
    it('should call and_then method', async () => {
      const result = Success({ value: 'test' });
      const callback = jest.fn().mockResolvedValue(Success({ value: 'next' }));

      // Mock and_then to verify it's called
      const andThenSpy = jest.spyOn(result, 'and_then');

      await result.execUseCase(callback);

      expect(andThenSpy).toHaveBeenCalledWith(callback);
      andThenSpy.mockRestore();
    });
  });

  describe('onSuccess method', () => {
    it('should execute callback when result is successful', () => {
      const data = { value: 'test' };
      const result = Success(data);
      const callback = jest.fn();

      const returnedResult = result.onSuccess(callback);

      expect(callback).toHaveBeenCalledWith(data, result);
      expect(returnedResult).toEqual(result);
    });

    it('should not execute callback when result is a failure', () => {
      const result = Failure(new Error('Test error'));
      const callback = jest.fn();

      const returnedResult = result.onSuccess(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(returnedResult).toEqual(result);
    });
  });

  describe('onFailure method', () => {
    it('should execute callback when result is a failure with matching type', () => {
      const error = new Error('Test error');
      const result = Failure(error, 'CUSTOM_FAILURE');
      const callback = jest.fn();

      const returnedResult = result.onFailure(callback, 'CUSTOM_FAILURE');

      expect(callback).toHaveBeenCalledWith(error, result);
      expect(returnedResult).toEqual(result);
    });

    it('should not execute callback when result is successful', () => {
      const result = Success({ value: 'test' });
      const callback = jest.fn();

      const returnedResult = result.onFailure(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(returnedResult).toEqual(result);
    });

    it('should not execute callback when failure type does not match', () => {
      const result = Failure(new Error('Test error'), 'CUSTOM_FAILURE');
      const callback = jest.fn();

      const returnedResult = result.onFailure(callback, 'DIFFERENT_FAILURE');

      expect(callback).not.toHaveBeenCalled();
      expect(returnedResult).toEqual(result);
    });

    it('should use default failure type when not specified', () => {
      const error = new Error('Test error');
      const result = Failure(error); // Default type is 'FAILURE'
      const callback = jest.fn();

      result.onFailure(callback); // No type specified, should use default 'FAILURE'

      expect(callback).toHaveBeenCalledWith(error, result);
    });
  });

  describe('ResultPromise class', () => {
    describe('constructor', () => {
      it('should create a ResultPromise from a Promise<Result>', async () => {
        const promise = Promise.resolve(Success({ value: 'test' }));
        const resultPromise = new ResultPromise(promise);

        const result = await resultPromise.toResult();
        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual({ value: 'test' });
      });
    });

    describe('then method', () => {
      it('should implement the PromiseLike interface', async () => {
        const promise = Promise.resolve(Success({ value: 'test' }));
        const resultPromise = new ResultPromise(promise);

        const result = await resultPromise;
        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual({ value: 'test' });
      });
    });

    describe('and_then method', () => {
      it('should chain operations on successful results', async () => {
        const promise = Promise.resolve(Success({ value: 'test' }));
        const resultPromise = new ResultPromise(promise);

        const chainedPromise = resultPromise.and_then(async data => {
          return Success({ newValue: data.value + ' modified' });
        });

        const result = await chainedPromise.toResult();
        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual({ newValue: 'test modified' });
      });

      it('should not execute callback for failed results', async () => {
        const error = new Error('Test error');
        const promise = Promise.resolve(Failure(error));
        const resultPromise = new ResultPromise(promise);

        const callback = jest.fn().mockResolvedValue(Success({ value: 'new' }));
        const chainedPromise = resultPromise.and_then(callback);

        const result = await chainedPromise.toResult();
        expect(callback).not.toHaveBeenCalled();
        expect(result.isFailure()).toBe(true);
        expect(result.getError()).toBe(error);
      });
    });

    describe('onSuccess method', () => {
      it('should execute callback for successful results', async () => {
        const promise = Promise.resolve(Success({ value: 'test' }));
        const resultPromise = new ResultPromise(promise);

        const callback = jest.fn();
        resultPromise.onSuccess(callback);

        await resultPromise.toResult();
        expect(callback).toHaveBeenCalledWith({ value: 'test' }, expect.any(Result));
      });

      it('should allow chaining', async () => {
        const promise = Promise.resolve(Success({ value: 'test' }));
        const resultPromise = new ResultPromise(promise);

        const callback1 = jest.fn();
        const callback2 = jest.fn();

        resultPromise.onSuccess(callback1).onSuccess(callback2);

        await resultPromise.toResult();
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
      });
    });

    describe('onFailure method', () => {
      it('should execute callback for failed results with matching type', async () => {
        const error = new Error('Test error');
        const promise = Promise.resolve(Failure(error, 'CUSTOM_ERROR'));
        const resultPromise = new ResultPromise(promise);

        const callback = jest.fn();
        resultPromise.onFailure(callback, 'CUSTOM_ERROR');

        await resultPromise.toResult();
        expect(callback).toHaveBeenCalledWith(error, expect.any(Result));
      });

      it('should not execute callback for successful results', async () => {
        const promise = Promise.resolve(Success({ value: 'test' }));
        const resultPromise = new ResultPromise(promise);

        const callback = jest.fn();
        resultPromise.onFailure(callback);

        await resultPromise.toResult();
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('toResult method', () => {
      it('should resolve to the Result', async () => {
        const originalResult = Success({ value: 'test' });
        const promise = Promise.resolve(originalResult);
        const resultPromise = new ResultPromise(promise);

        const result = await resultPromise.toResult();
        expect(result).toBe(originalResult);
      });
    });
  });
});
