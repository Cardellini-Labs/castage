import { describe, it, expect, jest } from '@jest/globals';
import { Equal, Expect } from '@type-challenges/utils';
import { ok } from 'resultage';
import { int, string } from './primitives';
import { oneOf } from './oneOf';
import { ERR_INVALID_VALUE_TYPE, OkType } from './types';
import { struct } from './struct';
import { values } from './values';
import { castErr } from './casting-error';
import { ref } from './ref';
import { text } from './text';

describe('oneOf', () => {
  describe('oneOf(ref(() => Target), ref(() => string))', () => {
    const Target = struct({ value: text.int }, 'Target');
    const Combined = oneOf(
      ref(() => Target),
      ref(() => string),
    );

    it('does not resolve references before their targets are declared', () => {
      const resolve = jest.fn(() => Target);
      const Combined = oneOf(ref(resolve), string);
      const Target = struct({ value: text.int }, 'Target');

      expect(resolve).not.toHaveBeenCalled();
      expect(Combined({ value: '42' })).toEqual(ok({ value: 42 }));
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('produces the union of the referenced types', () => {
      type Check = Expect<
        Equal<OkType<typeof Combined>, { value: number } | string>
      >;
      const result: Check = true;

      expect(result).toBe(true);
    });

    it('inherits the referenced caster names', () => {
      expect(Combined.name).toBe('(Target | string)');
    });

    it.each([
      { input: { value: '42' }, output: { value: 42 } },
      { input: 'fallback', output: 'fallback' },
    ])('casts and parses $input to $output', ({ input, output }) => {
      expect(Combined(input)).toEqual(ok(output));
      expect(Combined.parse(input)).toEqual(ok(output));
    });

    it('preserves referenced error causes and the caller path', () => {
      const input = { value: 'invalid' };
      const path = ['body'];
      const error = castErr(ERR_INVALID_VALUE_TYPE, path, {
        expected: '(Target | string)',
        received: input,
        causes: [
          Target(input, path).unwrapErr(),
          string(input, path).unwrapErr(),
        ],
      });

      expect(Combined(input, path)).toEqual(error);
      expect(Combined.parse(input, path).unwrapErr()).toEqual([
        error.unwrapErr(),
      ]);
    });
  });

  describe('oneOf(int, string)', () => {
    const intOrString = oneOf(int, string);

    type IntOrString = OkType<typeof intOrString>;

    it('produces correct type', () => {
      type Check = Expect<Equal<IntOrString, number | string>>;

      const result: Check = true;

      expect(result).toEqual(true);
    });

    it.each([0, 1, '0', '1', '', 'bla-bla'])('returns ok(%p)', (value) => {
      expect(intOrString(value)).toEqual(ok(value));
    });

    it.each([false, true, {}, [], 1.5, 123n, null, undefined])(
      'returns err(ERR_INVALID_VALUE_TYPE) for %p',
      (value) => {
        expect(intOrString(value)).toEqual(
          castErr('ERR_INVALID_VALUE_TYPE', [], {
            expected: '(int | string)',
            received: value,
            causes: [int(value).unwrapErr(), string(value).unwrapErr()],
          }),
        );
      },
    );
  });

  describe('oneOf(User, Failure)', () => {
    const User = struct(
      {
        name: string,
        age: int,
      },
      'User',
    );

    const Failure = struct(
      {
        code: values('ERR_1', 'ERR_2'),
        message: string,
      },
      'Failure',
    );

    const SomeResult = oneOf(User, Failure);

    type TSomeResult = OkType<typeof SomeResult>;

    it('produces correct type', () => {
      type Check = Expect<
        Equal<
          TSomeResult,
          | {
              name: string;
              age: number;
            }
          | {
              code: 'ERR_1' | 'ERR_2';
              message: string;
            }
        >
      >;

      const result: Check = true;

      expect(result).toEqual(true);
    });

    it.each([
      {
        name: 'John',
        age: 30,
      },
      {
        code: 'ERR_1',
        message: 'Some error',
      },
      {
        code: 'ERR_2',
        message: 'Some error',
      },
    ])('returns ok(%p)', (value) => {
      expect(SomeResult(value)).toEqual(ok(value));
    });

    it.each([
      {
        name: 'John',
        age: 30,
        extra: 'extra',
      },
      {
        code: 'ERR_1',
        message: 'Some error',
        extra: 'extra',
      },
      {
        code: 'ERR_2',
        message: 'Some error',
        extra: 'extra',
      },
    ])('returns ok(%p)', (value) => {
      const expected: any = value;
      delete expected.extra;
      expect(SomeResult(value)).toEqual(ok(expected));
    });

    it.each([
      false,
      true,
      {},
      [],
      1.5,
      123n,
      null,
      undefined,
      {
        age: 30,
        extra: 'extra',
      },
      {
        code: 'ERR_1',
        extra: 'extra',
      },
      {
        message: 'Some error',
        extra: 'extra',
      },
    ])('returns err(ERR_INVALID_VALUE_TYPE) for %p', (value) => {
      expect(SomeResult(value)).toEqual(
        castErr(ERR_INVALID_VALUE_TYPE, [], {
          expected: '(User | Failure)',
          received: value,
          causes: [User(value).unwrapErr(), Failure(value).unwrapErr()],
        }),
      );
    });
  });
});
