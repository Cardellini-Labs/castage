import { describe, it, expect, jest } from '@jest/globals';
import type { Equal, Expect } from '@type-challenges/utils';
import { ok } from 'resultage';
import { allOf } from './allOf';
import { number, string } from './primitives';
import { struct } from './struct';
import { castErr, castingErr } from './casting-error';
import { ref } from './ref';
import { text } from './text';
import type { OkType } from './types';

describe('allOf', () => {
  describe('allOf(ref(() => Target), ref(() => Label))', () => {
    const Target = struct({ value: text.int }, 'Target');
    const Label = struct({ label: string }, 'Label');
    const Combined = allOf(
      ref(() => Target),
      ref(() => Label),
    );

    it('does not resolve references before their targets are declared', () => {
      const resolve = jest.fn(() => Target);
      const Combined = allOf(ref(resolve), Label);
      const Target = struct({ value: text.int }, 'Target');

      expect(resolve).not.toHaveBeenCalled();
      expect(Combined({ value: '42', label: 'test' })).toEqual(
        ok({ value: 42, label: 'test' }),
      );
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('produces the intersection of the referenced types', () => {
      type Check = Expect<
        Equal<OkType<typeof Combined>, { value: number } & { label: string }>
      >;
      const result: Check = true;

      expect(result).toBe(true);
    });

    it('inherits the referenced caster names', () => {
      expect(Combined.name).toBe('(Target & Label)');
    });

    it('casts and parses the merged, transformed values', () => {
      const input = { value: '42', label: 'test', extra: true };
      const output = { value: 42, label: 'test' };

      expect(Combined(input)).toEqual(ok(output));
      expect(Combined.parse(input)).toEqual(ok(output));
    });

    it.each([
      { input: { value: 'invalid', label: 'test' }, target: Target },
      { input: { value: '42', label: 42 }, target: Label },
    ])('preserves the referenced error for $input', ({ input, target }) => {
      const path = ['body'];
      const error = target(input, path).unwrapErr();

      expect(Combined(input, path).unwrapErr()).toEqual(error);
      expect(Combined.parse(input, path).unwrapErr()).toEqual([error]);
    });

    it('uses referenced names when rejecting a non-object', () => {
      const path = ['body'];
      const error = castErr('ERR_INVALID_VALUE_TYPE', path, {
        expected: '(Target & Label)',
        received: null,
      });

      expect(Combined(null, path)).toEqual(error);
      expect(Combined.parse(null, path).unwrapErr()).toEqual([
        error.unwrapErr(),
      ]);
    });
  });

  const caster1 = struct({ a: number });

  const caster2 = struct({ b: string });

  it('should combine multiple casters and merge their results', () => {
    expect.assertions(2);
    const combinedCaster = allOf(caster1, caster2);
    const result = combinedCaster({ a: 1, b: 'test' });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toEqual({ a: 1, b: 'test' });
    }
  });

  it('should return an error if any caster fails', () => {
    expect.assertions(2);

    const combinedCaster = allOf(caster1, caster2);
    const result = combinedCaster({ a: 1, b: 2 });

    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error).toEqual(
        castingErr('ERR_INVALID_VALUE_TYPE', ['b'], {
          expected: 'string',
          received: 2,
        }),
      );
    }
  });

  it('should return an error if input is not an object', () => {
    expect.assertions(2);
    const combinedCaster = allOf(caster1, caster2);
    const result = combinedCaster(null);

    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error).toEqual(
        castingErr('ERR_INVALID_VALUE_TYPE', [], {
          expected: '({ a: number } & { b: string })',
          received: null,
        }),
      );
    }
  });
});
