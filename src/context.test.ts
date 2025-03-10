import { Context } from './context';

describe('Context Class', () => {
  describe('constructor', () => {
    it('should store input and output parameters', () => {
      const input = { id: '123', name: 'Test' };
      const output = { result: 'Success', count: 5 };

      const context = new Context(input, output);

      expect(context._inputParams).toBe(input);
      expect(context._outputParams).toBe(output);
    });

    it('should handle null or undefined input', () => {
      const output = { result: 'Success' };

      const context = new Context(null as any, output);

      expect(context._inputParams).toEqual({});
      expect(context._outputParams).toBe(output);
    });

    it('should handle null or undefined output', () => {
      const input = { id: '123' };

      const context = new Context(input, null as any);

      expect(context._inputParams).toBe(input);
      expect(context._outputParams).toEqual({});
    });

    it('should create properties from input and output', () => {
      const input = { id: '123', name: 'Test' };
      const output = { result: 'Success', count: 5 };

      const context = new Context(input, output);

      expect((context as any).id).toBe('123');
      expect((context as any).name).toBe('Test');
      expect((context as any).result).toBe('Success');
      expect((context as any).count).toBe(5);
    });

    it('should not override existing properties', () => {
      // Modificado: Usando getter em vez de propriedade readonly
      class TestContext<I, O> extends Context<I, O> {
        get id() {
          return 'fixed';
        }
      }

      const input = { id: '123', name: 'Test' };
      const output = { result: 'Success' };

      const context = new TestContext(input, output);

      // O id property não deve ser sobrescrito
      expect((context as any).id).toBe('fixed');
      expect((context as any).name).toBe('Test');
      expect((context as any).result).toBe('Success');
    });

    it('should make properties non-writable', () => {
      const input = { id: '123' };
      const output = { result: 'Success' };

      const context = new Context(input, output);

      // Attempt to modify a property
      expect(() => {
        (context as any).id = 'new-id';
      }).toThrow();
    });
  });

  describe('getInput method', () => {
    it('should return the input parameters', () => {
      const input = { id: '123', name: 'Test' };
      const output = { result: 'Success' };

      const context = new Context(input, output);

      expect(context.getInput()).toBe(input);
    });
  });

  describe('getOutput method', () => {
    it('should return the output parameters', () => {
      const input = { id: '123' };
      const output = { result: 'Success', count: 5 };

      const context = new Context(input, output);

      expect(context.getOutput()).toBe(output);
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const context = new Context({}, {});

      expect(context._inputParams).toEqual({});
      expect(context._outputParams).toEqual({});
    });

    it('should handle objects with same property names', () => {
      const input = { id: '123', shared: 'input' };
      const output = { result: 'Success', shared: 'output' };

      const context = new Context(input, output);

      // Output properties should override input properties with the same name
      expect((context as any).shared).toBe('output');
    });

    it('should handle non-primitive property values', () => {
      const nestedObject = { nested: 'value' };
      const input = { obj: nestedObject };
      const output = { arr: [1, 2, 3] };

      const context = new Context(input, output);

      expect((context as any).obj).toBe(nestedObject);
      expect((context as any).arr).toEqual([1, 2, 3]);
    });
  });
});
