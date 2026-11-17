import { describe, it, expect } from '@jest/globals';
import { err, ok } from 'resultage';
import { number, string, unknown } from './primitives';
import { values } from './values';
import { record } from './record';
import { castErr, castingErr } from './casting-error';

describe('record', () => {
  describe('record(string, string)', () => {
    const recordType = record(string, string);
    it.each([[{}], [{ 0: '0' }], [{ 1: '1' }], [{ 1: '1', 2: '2', 3: '3' }]])(
      'returns ok(%p)',
      (value) => {
        expect(recordType(value)).toEqual(ok(value));
      },
    );

    it.each([
      [false],
      [true],
      [''],
      ['0'],
      ['1'],
      ['1.5'],
      [[]],
      [[1]],
      [[1, 2, 3]],
      [null],
      [undefined],
    ])('returns err(ERR_INVALID_VALUE_TYPE) for %j', (value) => {
      expect(recordType(value)).toEqual(
        castErr('ERR_INVALID_VALUE_TYPE', [], {
          expected: 'Record<string, string>',
          received: value,
        }),
      );
    });

    it.each([[{ [Symbol.for('z')]: '3' }]])(
      'returns err(ERR_INVALID_KEY) for %j',
      (value) => {
        expect(recordType(value, ['obj'])).toEqual(
          castErr('ERR_INVALID_KEY', ['obj'], {
            expected: 'string',
            received: Symbol.for('z'),
          }),
        );
      },
    );

    it.each([
      [{ s: 1 }],
      [{ s: 's', b: {} }],
      [{ s: 's', b: [] }],
      [{ s: 's', b: null }],
      [{ s: 's', b: undefined }],
    ])('returns err(ERR_INVALID_VALUE_TYPE) for %j', (value) => {
      const keys = Object.keys(value) as (keyof typeof value)[];
      const key = keys.find((k) => typeof value[k] !== 'string');
      expect(recordType(value, ['obj'])).toEqual(
        castErr('ERR_INVALID_VALUE_TYPE', ['obj', key!], {
          expected: 'string',
          received: value[key!],
        }),
      );
    });
  });

  describe('record(values("x", "y"), number)', () => {
    const recordType = record(values('x', 'y'), number);
    it.each([[{}], [{ x: 1 }], [{ x: 1, y: 2 }]])('returns ok(%p)', (value) => {
      expect(recordType(value)).toEqual(ok(value));
    });

    it.each([
      [{ x: 1, z: 2 }],
      // [{ z: '3' }],
    ])('returns err(ERR_INVALID_KEY) for %j', (value) => {
      expect(recordType(value, ['obj'])).toEqual(
        castErr('ERR_INVALID_KEY', ['obj'], {
          expected: '"x" | "y"',
          received: 'z',
        }),
      );
    });

    it.each([
      [{ x: 1, y: '3' }],
      [{ x: 1, y: [] }],
      [{ x: 1, y: null }],
      [{ x: 1, y: undefined }],
    ])('returns err(ERR_INVALID_VALUE_TYPE) for %j', (value) => {
      expect(recordType(value, ['obj'])).toEqual(
        castErr('ERR_INVALID_VALUE_TYPE', ['obj', 'y'], {
          expected: 'number',
          received: (value as any).y as unknown,
        }),
      );
    });
  });
});

describe('record.parse', () => {
  const recordType = record(string, string);

  it.each([
    [{}, {}],
    [{ 0: '0' }, { 0: '0' }],
    [{ 1: '1' }, { 1: '1' }],
    [
      { 1: '1', 2: '2', 3: '3' },
      { 1: '1', 2: '2', 3: '3' },
    ],
  ])('returns ok(%p) for %j', (value, expected) => {
    expect(recordType.parse(value, [])).toEqual(ok(expected));
  });

  it.each([
    [false],
    [true],
    [''],
    ['0'],
    ['1'],
    ['1.5'],
    [[]],
    [[1]],
    [[1, 2, 3]],
    [null],
    [undefined],
  ])('returns err([ERR_INVALID_VALUE_TYPE]) for %j', (value) => {
    expect(recordType.parse(value, [])).toEqual(
      err([
        castingErr('ERR_INVALID_VALUE_TYPE', [], {
          expected: 'Record<string, string>',
          received: value,
        }),
      ]),
    );
  });

  it.each([
    [
      { x: 1, y: 2 },
      [
        castingErr('ERR_INVALID_VALUE_TYPE', ['x'], {
          expected: 'string',
          received: 1,
        }),
        castingErr('ERR_INVALID_VALUE_TYPE', ['y'], {
          expected: 'string',
          received: 2,
        }),
      ],
    ],
  ])('returns list of errors for $j', (value, expected) => {
    expect(recordType.parse(value, [])).toEqual(err(expected));
  });
});

describe.each(['cast', 'parse'] as const)(
  'record %s prototype safety',
  (mode) => {
    it.each([
      '{"__proto__":{"admin":true},"name":"Ada"}',
      '{"__proto__":null,"name":"Ada"}',
      '{"__proto__":"text","name":"Ada"}',
    ])('preserves __proto__ as an own data property for %s', (json) => {
      const input = JSON.parse(json);
      const caster = record(string, unknown);
      const output = (
        mode === 'cast' ? caster(input) : caster.parse(input)
      ).unwrap();

      expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
      expect(Object.getOwnPropertyDescriptor(output, '__proto__')).toEqual({
        value: input['__proto__'],
        enumerable: true,
        writable: true,
        configurable: true,
      });
      expect(output.admin).toBeUndefined();
      expect(output.name).toBe('Ada');
      expect(JSON.stringify(output)).toBe(json);
    });

    it('safely stores keys transformed to __proto__', () => {
      const caster = record(
        string.map(() => '__proto__'),
        unknown,
      );
      const input = { key: { admin: true } };
      const output = (
        mode === 'cast' ? caster(input) : caster.parse(input)
      ).unwrap();

      expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
      expect(Object.getOwnPropertyDescriptor(output, '__proto__')).toEqual({
        value: input.key,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      expect(output.admin).toBeUndefined();
    });
  },
);
