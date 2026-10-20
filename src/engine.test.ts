import { describe, it, expect, jest } from '@jest/globals';
import { ok } from 'resultage';
import { casterApi, fromGuardAndTransform } from './engine';

describe('caster name', () => {
  it('does not compute a lazy name when creating a caster', () => {
    const name = jest.fn(() => 'Target');
    casterApi((value) => ok(value), name);

    expect(name).not.toHaveBeenCalled();
  });

  it('computes a lazy name only on the first read', () => {
    const name = jest.fn(() => 'Target');
    const Target = casterApi((value) => ok(value), name);

    expect(Target.name).toBe('Target');
    expect(Target.name).toBe('Target');
    expect(name).toHaveBeenCalledTimes(1);
  });

  it('caches an empty name', () => {
    const name = jest.fn(() => '');
    const Target = casterApi((value) => ok(value), name);

    expect(Target.name).toBe('');
    expect(Target.name).toBe('');
    expect(name).toHaveBeenCalledTimes(1);
  });

  it('retries name resolution after a failed attempt', () => {
    const error = new Error('Target is not initialized');
    const name = jest
      .fn<() => string>()
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockReturnValue('Target');
    const Target = casterApi((value) => ok(value), name);

    expect(() => Target.name).toThrow(error);
    expect(Target.name).toBe('Target');
    expect(Target.name).toBe('Target');
    expect(name).toHaveBeenCalledTimes(2);
  });

  it('uses the same cached name for casting and parsing errors', () => {
    const name = jest.fn(() => 'Target');
    const Target = fromGuardAndTransform(
      (value): value is object => typeof value === 'object' && value !== null,
      (value) => ok(value),
      name,
      undefined,
      (value) => ok(value),
    );

    expect(Target(null).unwrapErr().extra.expected).toBe('Target');
    expect(Target.parse(null).unwrapErr()[0].extra.expected).toBe('Target');
    expect(Target.name).toBe('Target');
    expect(name).toHaveBeenCalledTimes(1);
  });
});
