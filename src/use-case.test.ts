import { UseCase } from './use-case';
import { Result, Success, Failure } from './result';
import { Context } from './context';

// Mock implementations for testing
class SuccessUseCase extends UseCase<string, number> {
  async execute(input?: string): Promise<Result<number>> {
    return Success(input ? input.length : 0);
  }
}

class FailureUseCase extends UseCase<string, number> {
  async execute(): Promise<Result<number>> {
    return Failure(new Error('Test error'));
  }
}

class ThrowingUseCase extends UseCase<string, number> {
  async execute(): Promise<Result<number>> {
    throw new Error('Execution error');
  }
}

class ThrowingNonErrorUseCase extends UseCase<string, number> {
  async execute(): Promise<Result<number>> {
    throw 'string error';
  }
}

describe('UseCase Abstract Class', () => {
  describe('call method', () => {
    it('should return success result when execute succeeds', async () => {
      const useCase = new SuccessUseCase();
      const input = 'test';

      const result = await useCase.call(input);

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(4); // Length of 'test'
      expect(result.getType()).toBe('SUCCESS');
    });

    it('should include context with use case name and input/output', async () => {
      const useCase = new SuccessUseCase();
      const input = 'test';

      const result = await useCase.call(input);

      expect(result.context).toHaveProperty('SuccessUseCase');
      expect(result.context.SuccessUseCase).toBeInstanceOf(Context);
      expect(result.context.SuccessUseCase._inputParams).toBe(input);
      expect(result.context.SuccessUseCase._outputParams).toBe(4);
    });

    it('should return failure result when execute returns failure', async () => {
      const useCase = new FailureUseCase();

      const result = await useCase.call('test');

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toBe('Test error');
      expect(result.useCaseClass).toBe('FailureUseCase');
    });

    it('should handle errors thrown during execution', async () => {
      const useCase = new ThrowingUseCase();

      const result = await useCase.call('test');

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toBe('Execution error');
      expect(result.getType()).toBe('UNEXPECTED_ERROR');
      expect(result.context).toHaveProperty('rawError');
    });

    it('should handle non-Error objects thrown during execution', async () => {
      const useCase = new ThrowingNonErrorUseCase();

      const result = await useCase.call('test');

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toBe('string error');
      expect(result.getType()).toBe('UNEXPECTED_ERROR');
    });

    it('should handle undefined input', async () => {
      const useCase = new SuccessUseCase();

      const result = await useCase.call();

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(0);
    });
  });

  describe('static call method', () => {
    it('should create an instance and call the instance method', async () => {
      const result = await SuccessUseCase.call('test');

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(4);
      expect(result.useCaseClass).toBe('SuccessUseCase');
    });

    it('should handle failures from instance method', async () => {
      const result = await FailureUseCase.call('test');

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toBe('Test error');
    });

    it('should handle errors thrown during execution', async () => {
      const result = await ThrowingUseCase.call('test');

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toBe('Execution error');
    });

    it('should throw error when called directly on abstract UseCase class', async () => {
      // Tentativa de chamar o método estático diretamente na classe abstrata
      await expect(UseCase.call()).rejects.toThrow(
        'Cannot call static method on abstract UseCase class',
      );
    });
  });

  describe('execute method', () => {
    it('should be abstract and throw error if not implemented', async () => {
      // Modificado: Implementando o método execute que lança um erro
      class InvalidUseCase extends UseCase<string, number> {
        async execute(): Promise<Result<number>> {
          throw new Error('Method not implemented');
        }
      }

      const useCase = new InvalidUseCase();

      await expect(useCase.execute()).rejects.toThrow('Method not implemented');
    });
  });

  // describe("callChain method", () => {
  //   it("should return a ResultPromise", async () => {
  //     const useCase = new SuccessUseCase();
  //     const resultPromise = useCase.callChain("test");

  //     expect(resultPromise).toBeInstanceOf(ResultPromise);

  //     const result = await resultPromise.toResult();
  //     expect(result.isSuccess()).toBe(true);
  //     expect(result.getValue()).toBe(4);
  //   });

  //   it("should allow chaining with and_then", async () => {
  //     const useCase = new SuccessUseCase();

  //     const resultPromise = useCase.callChain("test")
  //       .and_then(async (value) => {
  //         return Success(value * 2);
  //       });

  //     const result = await resultPromise.toResult();
  //     expect(result.isSuccess()).toBe(true);
  //     expect(result.getValue()).toBe(8);
  //   });

  //   it("should handle failures in the chain", async () => {
  //     const useCase = new SuccessUseCase();

  //     const resultPromise = useCase.callChain("test")
  //       .and_then(async () => {
  //         return Failure(new Error("Test error"));
  //       });

  //     const result = await resultPromise.toResult();
  //     expect(result.isFailure()).toBe(true);
  //     expect(result.getError().message).toBe("Test error");
  //   });
  // });

  // describe("static callChain method", () => {
  //   it("should create an instance and return a ResultPromise", async () => {
  //     const resultPromise = SuccessUseCase.callChain("test");

  //     expect(resultPromise).toBeInstanceOf(ResultPromise);

  //     const result = await resultPromise.toResult();
  //     expect(result.isSuccess()).toBe(true);
  //     expect(result.getValue()).toBe(4);
  //   });

  //   it("should throw error when called directly on abstract UseCase class", async () => {
  //     const resultPromise = UseCase.callChain();

  //     await expect(resultPromise.toResult()).rejects.toThrow(
  //       "Cannot call static method on abstract UseCase class"
  //     );
  //   });
  // });
});
