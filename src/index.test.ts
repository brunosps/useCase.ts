import * as index from './index';
import { Result, Success, Failure } from './result';
import { Context } from './context';
import { UseCase } from './use-case';

describe('Index exports', () => {
  it('should export Result class', () => {
    expect(index.Result).toEqual(Result);
  });

  it('should export Success function', () => {
    expect(index.Success).toEqual(Success);
  });

  it('should export Failure function', () => {
    expect(index.Failure).toEqual(Failure);
  });

  it('should export Context class', () => {
    expect(index.Context).toEqual(Context);
  });

  it('should export UseCase class', () => {
    expect(index.UseCase).toEqual(UseCase);
  });
});
