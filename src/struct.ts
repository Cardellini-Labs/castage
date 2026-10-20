import { err, ok } from 'resultage';
import { fromGuardAndTransform } from './engine.js';
import { castingErr } from './casting-error.js';
import {
  type Caster,
  type CastingError,
  ERR_INVALID_VALUE_TYPE,
  ERR_MISSING_VALUE,
  type UndefinedAsOptional,
} from './types.js';
import { isObject } from './predicates.js';
import { hasOwn, propertyKeys } from './tools.js';

type Schema<T> = { readonly schema: T };

const errMissingValue = (error: CastingError, caster: Caster<unknown>) =>
  castingErr(ERR_MISSING_VALUE, error.path, { expected: caster.name });

const defaultStructName = (casters: Record<PropertyKey, any>) =>
  `{ ${(Object.entries(casters) as [PropertyKey, Caster<any>][])
    .map(([k, v]) => `${String(k)}: ${v.name}`)
    .join(', ')} }`;

const transform =
  <T extends Record<PropertyKey, any>>(casters: {
    [K in keyof T]: Caster<T[K]>;
  }) =>
  (value: Record<PropertyKey, unknown>, path: string[]) => {
    const result = {} as T;
    const keys = propertyKeys(casters);

    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const caster = casters[k] as Caster<T[typeof k]>;
      const v = value[k];

      const kResult = caster(v, [...path, String(k)]).mapErr((error) =>
        !hasOwn(value, k) ? errMissingValue(error, caster) : error,
      );

      if (kResult.isErr) return kResult;
      result[k] = kResult.unwrap();
    }

    return ok(result);
  };

const parse =
  <T extends Record<PropertyKey, any>>(casters: {
    [K in keyof T]: Caster<T[K]>;
  }) =>
  (value: Record<PropertyKey, unknown>, path: string[]) => {
    const result = {} as T;
    const keys = propertyKeys(casters);
    const errors: CastingError[] = [];

    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const caster = casters[k] as Caster<T[typeof k]>;
      const v = value[k];

      const kResult = caster
        .parse(v, [...path, String(k)])
        .mapErr((errors) =>
          errors.map((error) =>
            !hasOwn(value, k) ? errMissingValue(error, caster) : error,
          ),
        );

      if (kResult.isErr) {
        errors.push(...kResult.error);
        continue;
      }

      result[k] = kResult.unwrap();
    }

    return errors.length === 0 ? ok(result) : err(errors);
  };

export const struct = <T extends Record<PropertyKey, any>>(
  casters: { [K in keyof T]: Caster<T[K]> },
  name?: string,
): Caster<UndefinedAsOptional<T>> & Schema<{ [K in keyof T]: Caster<T[K]> }> =>
  Object.defineProperties(
    fromGuardAndTransform(
      isObject,
      transform(casters),
      name ?? (() => defaultStructName(casters)),
      ERR_INVALID_VALUE_TYPE,
      parse(casters),
    ) as Caster<T> & Schema<{ [K in keyof T]: Caster<T[K]> }>,
    {
      schema: {
        enumerable: true,
        get: () => casters,
      },
    },
  );
