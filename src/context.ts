// src/context.ts
export class Context<I, O> {
  readonly _inputParams: I;
  readonly _outputParams: O;

  constructor(input: I, data: O) {
    this._inputParams = input ?? ({} as I);
    this._outputParams = data ?? ({} as O);

    // Corrigir o problema de tipagem
    const properties = { ...(input || {}), ...(data || {}) } as Record<string, any>;

    Object.entries(properties).forEach(([key, value]) => {
      if (!(key in this)) {
        Object.defineProperty(this, key, {
          writable: false,
          configurable: true,
          enumerable: true,
          value,
        });
      }
    });
  }

  getInput(): I {
    return this._inputParams;
  }

  getOutput(): O {
    return this._outputParams;
  }
}
