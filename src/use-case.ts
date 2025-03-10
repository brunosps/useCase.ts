// src/use-case.ts
import { Context } from './context';
import { Failure, type Result, Success } from './result';

export interface IUseCase<I, O> {
  execute(input?: I): Promise<Result<O>>;
}

export abstract class UseCase<I, O> implements IUseCase<I, O> {
  abstract execute(input?: I): Promise<Result<O>>;

  async call(params?: I): Promise<Result<O>> {
    try {
      const result = await this.execute(params);

      if (result.isFailure()) {
        return Failure(result.getError(), result.getType(), result.context, this.constructor.name);
      }

      return Success(
        result.getValue(),
        {
          [this.constructor.name]: new Context<I, O>(params as I, result.getValue()),
        },
        this.constructor.name,
      );
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error(String(error)),
        'UNEXPECTED_ERROR',
        { rawError: error },
        this.constructor.name,
      );
    }
  }

  static async call<X, Y>(params?: X): Promise<Result<Y>> {
    // Verificar se a classe foi estendida corretamente
    if (this === UseCase) {
      throw new Error('Cannot call static method on abstract UseCase class');
    }

    // Usando uma abordagem diferente para criar a instância
    const ConcreteClass = this as unknown as new () => UseCase<X, Y>;
    const self = new ConcreteClass();

    return await self.call(params);
  }
}
