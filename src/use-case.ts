import { Context } from './context';
import { Failure, type Result, ResultPromise, Success } from './result';

export interface IUseCase<I, O> {
  execute(input?: I): Promise<Result<O>>;
}

// Classe base concreta que implementa a lógica comum
export class BaseUseCase<I, O> implements IUseCase<I, O> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(input?: I): Promise<Result<O>> {
    throw new Error('Method not implemented. Override this method in a subclass.');
  }

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

  callChain(params?: I): ResultPromise<O> {
    return new ResultPromise(this.call(params));
  }
}

// Classe abstrata para manter compatibilidade com código existente
export abstract class UseCase<I, O> extends BaseUseCase<I, O> {
  abstract execute(input?: I): Promise<Result<O>>;

  // Implementação dos métodos estáticos para compatibilidade com os testes
  // static async call<X, Y>(params?: X): Promise<Result<Y>> {
  //   // Verificar se está sendo chamado diretamente na classe abstrata
  //   if (this === UseCase) {
  //     throw new Error("Cannot call static method on abstract UseCase class");
  //   }

  //   // Usar type assertion para contornar a verificação de tipo
  //   // Isso diz ao TypeScript que sabemos o que estamos fazendo
  //   const UseCaseClass = this as unknown as new () => UseCase<X, Y>;
  //   const instance = new UseCaseClass();
  //   return await instance.call(params);
  // }

  static call<X, Y>(params?: X): ResultPromise<Y> {
    // Verificar se está sendo chamado diretamente na classe abstrata
    if (this === UseCase) {
      return new ResultPromise(
        Promise.reject(new Error('Cannot call static method on abstract UseCase class')),
      );
    }

    // Usar type assertion para contornar a verificação de tipo
    const UseCaseClass = this as unknown as new () => UseCase<X, Y>;
    const instance = new UseCaseClass();
    return instance.callChain(params);
  }
}
