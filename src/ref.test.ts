import { describe, it, expect, jest } from '@jest/globals';
import type { Equal, Expect } from '@type-challenges/utils';
import { ok } from 'resultage';
import {
  array,
  casterApi,
  ref,
  string,
  struct,
  text,
  type CastedBy,
  type Caster,
  type CasterFn,
  type ParserFn,
} from './index';

const Target = struct({ value: text.int }, 'Target');
type TargetValue = { value: number };

const StructRef = struct({ f: ref(() => Target) });
const RefStruct = ref(() => struct({ f: Target }));
const ArrayRef = array(ref(() => Target));
const RefArray = ref(() => array(Target));
const StructArrayRef = struct({ f: array(ref(() => Target)) });
const StructRefArray = struct({ f: ref(() => array(Target)) });
const RefStructArray = ref(() => struct({ f: array(Target) }));
const ArrayStructRef = array(struct({ f: ref(() => Target) }));
const ArrayRefStruct = array(ref(() => struct({ f: Target })));
const RefArrayStruct = ref(() => array(struct({ f: Target })));
const OptionalRef = ref(() => Target).optional;
const NullableRef = ref(() => Target).nullable;
const StructOptionalRef = struct({ f: OptionalRef });

// Compiled by ts-jest and tsc: these fail if inference changes, including to any.
export type RefTypeChecks = [
  Expect<Equal<CastedBy<typeof StructRef>, { f: TargetValue }>>,
  Expect<Equal<CastedBy<typeof RefStruct>, { f: TargetValue }>>,
  Expect<Equal<CastedBy<typeof ArrayRef>, TargetValue[]>>,
  Expect<Equal<CastedBy<typeof RefArray>, TargetValue[]>>,
  Expect<Equal<CastedBy<typeof StructArrayRef>, { f: TargetValue[] }>>,
  Expect<Equal<CastedBy<typeof StructRefArray>, { f: TargetValue[] }>>,
  Expect<Equal<CastedBy<typeof RefStructArray>, { f: TargetValue[] }>>,
  Expect<Equal<CastedBy<typeof ArrayStructRef>, { f: TargetValue }[]>>,
  Expect<Equal<CastedBy<typeof ArrayRefStruct>, { f: TargetValue }[]>>,
  Expect<Equal<CastedBy<typeof RefArrayStruct>, { f: TargetValue }[]>>,
  Expect<Equal<CastedBy<typeof OptionalRef>, TargetValue | undefined>>,
  Expect<Equal<CastedBy<typeof NullableRef>, TargetValue | null>>,
  Expect<Equal<CastedBy<typeof StructOptionalRef>, { f?: TargetValue }>>,
];

describe('ref', () => {
  describe('resolution', () => {
    it('does not call the resolver when creating a reference', () => {
      const resolve = jest.fn(() => Target);
      ref(resolve);

      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not resolve the target when deriving a nullable reference', () => {
      const resolve = jest.fn(() => Target);
      ref(resolve).nullable;

      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not resolve the target when deriving an optional reference', () => {
      const resolve = jest.fn(() => Target);
      ref(resolve).optional;

      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not resolve a reference when composing an array', () => {
      const resolve = jest.fn(() => Target);
      array(ref(resolve));

      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not resolve a field reference when composing an unnamed struct', () => {
      const resolve = jest.fn(() => Target);
      struct({ f: ref(resolve) });

      expect(resolve).not.toHaveBeenCalled();
    });

    it('calls the resolver on the first cast', () => {
      const resolve = jest.fn(() => Target);
      const Reference = ref(resolve);

      expect(Reference({ value: '42' })).toEqual(ok({ value: 42 }));
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('reuses the resolved caster on subsequent casts', () => {
      const resolve = jest.fn(() => Target);
      const Reference = ref(resolve);

      Reference({ value: '1' });
      expect(Reference({ value: '2' })).toEqual(ok({ value: 2 }));
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('calls the resolver when parsing is the first use', () => {
      const resolve = jest.fn(() => Target);
      const Reference = ref(resolve);

      expect(Reference.parse({ value: '42' })).toEqual(ok({ value: 42 }));
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('shares the resolved caster between casting and parsing', () => {
      const resolve = jest.fn(() => Target);
      const Reference = ref(resolve);

      Reference.parse({ value: '1' });
      Reference({ value: '2' });
      Reference.parse({ value: '3' });

      expect(resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe('delegation', () => {
    it('passes the same input object to the target caster', () => {
      const cast = jest.fn<CasterFn<TargetValue>>(Target);
      const Reference = ref(() => casterApi(cast, 'Target'));
      const input = { value: '42' };

      Reference(input);

      expect(cast.mock.calls[0][0]).toBe(input);
    });

    it('passes the same path array to the target caster', () => {
      const cast = jest.fn<CasterFn<TargetValue>>(Target);
      const Reference = ref(() => casterApi(cast, 'Target'));
      const path = ['request', 'body'];

      Reference({ value: '42' }, path);

      expect(cast.mock.calls[0][1]).toBe(path);
    });

    it('returns the same successful Result produced by the target', () => {
      const result = Target({ value: '42' });
      const Reference = ref(() => casterApi(() => result, 'Target'));

      expect(Reference({ value: '42' })).toBe(result);
    });

    it('returns the same failed Result produced by the target', () => {
      const result = Target({ value: 'invalid' });
      const Reference = ref(() => casterApi(() => result, 'Target'));

      expect(Reference({ value: 'invalid' })).toBe(result);
    });

    it('delegates parse to the target parser and preserves the full failed Result', () => {
      const Target = struct({ a: string, b: string });
      const input = { a: 1, b: 2 };
      const path = ['body'];
      const result = Target.parse(input, path);
      const cast = jest.fn<CasterFn<CastedBy<typeof Target>>>();
      const parse = jest
        .fn<ParserFn<CastedBy<typeof Target>>>()
        .mockReturnValue(result);
      const Reference = ref(() => casterApi(cast, 'Target', parse));

      expect(Reference.parse(input, path)).toBe(result);
      expect(result.unwrapErr()).toHaveLength(2);
      expect(parse.mock.calls[0][0]).toBe(input);
      expect(parse.mock.calls[0][1]).toBe(path);
      expect(cast).not.toHaveBeenCalled();
    });

    it('preserves the successful Result returned by the target parser', () => {
      const result = Target.parse({ value: '42' });
      const cast = jest.fn<CasterFn<TargetValue>>();
      const Reference = ref(() => casterApi(cast, 'Target', () => result));

      expect(Reference.parse({ value: '42' })).toBe(result);
      expect(cast).not.toHaveBeenCalled();
    });
  });

  describe('name', () => {
    it('returns an explicit name without resolving the target', () => {
      const resolve = jest.fn(() => Target);
      const Reference = ref(resolve, 'Reference');

      expect(Reference.name).toBe('Reference');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('inherits the target name when no name was provided', () => {
      expect(ref(() => Target).name).toBe('Target');
    });

    it('reuses the caster resolved by reading its name when casting', () => {
      const resolve = jest.fn(() => Target);
      const Reference = ref(resolve);

      expect(Reference.name).toBe('Target');
      expect(Reference({ value: '42' })).toEqual(ok({ value: 42 }));
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('preserves an explicitly provided empty name', () => {
      expect(ref(() => Target, '').name).toBe('');
    });

    it('uses the inherited name for an optional reference', () => {
      expect(ref(() => Target).optional.name).toBe('Target | undefined');
    });

    it('uses the inherited name for a nullable reference', () => {
      expect(ref(() => Target).nullable.name).toBe('Target | null');
    });
  });

  describe.each([
    {
      source: 'struct({ f: ref(() => Target) })',
      caster: StructRef,
      input: { f: { value: '42' } },
      output: { f: { value: 42 } },
      invalid: { f: { value: 'invalid' } },
      path: ['f', 'value'],
    },
    {
      source: 'ref(() => struct({ f: Target }))',
      caster: RefStruct,
      input: { f: { value: '42' } },
      output: { f: { value: 42 } },
      invalid: { f: { value: 'invalid' } },
      path: ['f', 'value'],
    },
    {
      source: 'array(ref(() => Target))',
      caster: ArrayRef,
      input: [{ value: '42' }],
      output: [{ value: 42 }],
      invalid: [{ value: 'invalid' }],
      path: ['0', 'value'],
    },
    {
      source: 'ref(() => array(Target))',
      caster: RefArray,
      input: [{ value: '42' }],
      output: [{ value: 42 }],
      invalid: [{ value: 'invalid' }],
      path: ['0', 'value'],
    },
    {
      source: 'struct({ f: array(ref(() => Target)) })',
      caster: StructArrayRef,
      input: { f: [{ value: '42' }] },
      output: { f: [{ value: 42 }] },
      invalid: { f: [{ value: 'invalid' }] },
      path: ['f', '0', 'value'],
    },
    {
      source: 'struct({ f: ref(() => array(Target)) })',
      caster: StructRefArray,
      input: { f: [{ value: '42' }] },
      output: { f: [{ value: 42 }] },
      invalid: { f: [{ value: 'invalid' }] },
      path: ['f', '0', 'value'],
    },
    {
      source: 'ref(() => struct({ f: array(Target) }))',
      caster: RefStructArray,
      input: { f: [{ value: '42' }] },
      output: { f: [{ value: 42 }] },
      invalid: { f: [{ value: 'invalid' }] },
      path: ['f', '0', 'value'],
    },
    {
      source: 'array(struct({ f: ref(() => Target) }))',
      caster: ArrayStructRef,
      input: [{ f: { value: '42' } }],
      output: [{ f: { value: 42 } }],
      invalid: [{ f: { value: 'invalid' } }],
      path: ['0', 'f', 'value'],
    },
    {
      source: 'array(ref(() => struct({ f: Target })))',
      caster: ArrayRefStruct,
      input: [{ f: { value: '42' } }],
      output: [{ f: { value: 42 } }],
      invalid: [{ f: { value: 'invalid' } }],
      path: ['0', 'f', 'value'],
    },
    {
      source: 'ref(() => array(struct({ f: Target })))',
      caster: RefArrayStruct,
      input: [{ f: { value: '42' } }],
      output: [{ f: { value: 42 } }],
      invalid: [{ f: { value: 'invalid' } }],
      path: ['0', 'f', 'value'],
    },
  ])('$source', ({ caster, input, output, invalid, path }) => {
    it('returns the transformed nested value when casting', () => {
      expect(caster(input)).toEqual(ok(output));
    });

    it('returns the transformed nested value when parsing', () => {
      expect(caster.parse(input)).toEqual(ok(output));
    });

    it('returns the nested target error with the caller path', () => {
      expect(caster(invalid, ['body']).unwrapErr()).toMatchObject({
        code: 'ERR_INVALID_VALUE_TYPE',
        path: ['body', ...path],
        extra: { expected: 'text::int', received: 'invalid' },
      });
    });
  });

  describe('self reference', () => {
    interface Self {
      f: Self | null;
    }

    const Self: Caster<Self> = struct({ f: ref(() => Self).nullable }, 'Self');

    it('accepts valid data reached through a self reference', () => {
      const input = { f: { f: null } };

      expect(Self(input)).toEqual(ok(input));
    });

    it('rejects invalid data reached through a self reference', () => {
      expect(Self({ f: { f: 42 } }).unwrapErr()).toMatchObject({
        code: 'ERR_INVALID_VALUE_TYPE',
        path: ['f', 'f'],
        extra: { expected: 'Self | null', received: 42 },
      });
    });
  });

  describe('self reference through an array', () => {
    interface Self {
      f: Self[];
    }

    const Self: Caster<Self> = struct({ f: array(ref(() => Self)) }, 'Self');

    it('accepts a nested object reached through the array reference', () => {
      const input = { f: [{ f: [{ f: [] }] }] };

      expect(Self(input)).toEqual(ok(input));
    });

    it('rejects an invalid nested object reached through the array reference', () => {
      expect(Self({ f: [{ f: [42] }] }).unwrapErr()).toMatchObject({
        code: 'ERR_INVALID_VALUE_TYPE',
        path: ['f', '0', 'f', '0'],
        extra: { expected: 'Self', received: 42 },
      });
    });

    it('collects parse errors from separate recursive branches', () => {
      expect(
        Self.parse({ f: [{ f: [42] }, { f: [false] }] }).unwrapErr(),
      ).toMatchObject([
        {
          code: 'ERR_INVALID_VALUE_TYPE',
          path: ['f', '0', 'f', '0'],
          extra: { expected: 'Self', received: 42 },
        },
        {
          code: 'ERR_INVALID_VALUE_TYPE',
          path: ['f', '1', 'f', '0'],
          extra: { expected: 'Self', received: false },
        },
      ]);
    });
  });

  describe('mutual references', () => {
    interface Left {
      f: Right | null;
    }
    interface Right {
      f: Left | null;
    }

    const Left: Caster<Left> = struct({ f: ref(() => Right).nullable }, 'Left');
    const Right: Caster<Right> = struct(
      { f: ref(() => Left).nullable },
      'Right',
    );

    it('accepts valid data reached through both referenced casters', () => {
      const input = { f: { f: { f: null } } };

      expect(Left(input)).toEqual(ok(input));
    });

    it('rejects invalid data reached through both referenced casters', () => {
      expect(Left({ f: { f: { f: 42 } } }).unwrapErr()).toMatchObject({
        code: 'ERR_INVALID_VALUE_TYPE',
        path: ['f', 'f', 'f'],
        extra: { expected: 'Right | null', received: 42 },
      });
    });
  });
});
