import { unwrap, ok, err } from 'resultage';
import { fromGuardAndTransform } from './engine.js';
import { castingErr } from './casting-error.js';
import {
  type Caster,
  CastingError,
  ERR_INVALID_VALUE,
  ERR_INVALID_VALUE_TYPE,
} from './types.js';
import { isArray } from './predicates.js';

export const array = <T>(caster: Caster<T>, name?: string): Caster<T[]> =>
  fromGuardAndTransform(
    (value): value is T[] => isArray(value),
    (list, path) => {
      const items: T[] = [];

      for (let i = 0; i < list.length; i += 1) {
        const result = caster(list[i], [...path, i.toString()]);

        if (result.isErr) return result;

        items.push(unwrap(result));
      }

      return ok(items);
    },
    name ?? (() => `Array<${caster.name}>`),
    ERR_INVALID_VALUE_TYPE,
    (list, path) => {
      const items: T[] = [];
      const errors: CastingError[] = [];

      for (let i = 0; i < list.length; i += 1) {
        caster.parse(list[i], [...path, i.toString()]).match(
          (result) => items.push(result),
          (err) => errors.push(...err),
        );
      }

      return errors.length > 0 ? err(errors) : ok(items);
    },
  );

export const nonEmptyArray = <T>(
  caster: Caster<T>,
  name = `NonEmptyArray<${caster.name}>`,
): Caster<[T, ...T[]]> =>
  array(caster, name).validate(
    (value): value is [T, ...T[]] => value.length > 0,
    name,
    (value, path) =>
      castingErr(ERR_INVALID_VALUE, path, {
        expected: `[${caster.name}, ...]`,
        received: value,
      }),
  );
