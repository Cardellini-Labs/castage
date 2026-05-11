import { fromGuard } from './engine.js';
import { type Caster } from './types';

export const value = <T extends string | number | boolean>(
  value: T,
): Caster<T> =>
  fromGuard((v): v is T => v === value, `${JSON.stringify(value)}`);

export const values = <T extends (string | number | boolean)[]>(
  ...values: T
): Caster<T[number]> => {
  const valuesSet = new Set<unknown>(values);
  return fromGuard(
    (value): value is T[number] => valuesSet.has(value),
    `${values.map((v) => JSON.stringify(v)).join(' | ')}`,
  );
};
