import { err, ok } from 'resultage';
import { fromGuardAndTransform } from './engine.js';
import {
  type Caster,
  CastingError,
  ERR_INVALID_KEY,
  ERR_INVALID_VALUE_TYPE,
} from './types.js';
import { isObject } from './predicates.js';
import { propertyKeys } from './tools.js';
import { updateError } from './casting-error.js';

const transform =
  <K extends PropertyKey, T>(keyCaster: Caster<K>, valueCaster: Caster<T>) =>
  (value: Record<K, T>, path: string[]) => {
    const result: Record<K, T> = {} as Record<K, T>;
    const keys = propertyKeys(value);

    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const v = value[k];

      const keyResult = keyCaster(k, path).mapErr(
        updateError({ code: ERR_INVALID_KEY, path }),
      );

      if (keyResult.isErr) return keyResult;

      const valueResult = valueCaster(v, [...path, String(k)]);

      if (valueResult.isErr) return valueResult;

      Object.defineProperty(result, keyResult.value, {
        value: valueResult.value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    return ok(result);
  };

const parse =
  <K extends PropertyKey, T>(keyCaster: Caster<K>, valueCaster: Caster<T>) =>
  (value: Record<K, T>, path: string[]) => {
    const result: Record<K, T> = {} as Record<K, T>;
    const keys = propertyKeys(value);
    const errors: CastingError[] = [];

    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const v = value[k];

      // it is not expected that keyCaster.parse will return more then one error
      // so we can call keyCaster() instead of keyCaster.parse()
      const keyResult = keyCaster(k, path).mapErr(
        updateError({ code: ERR_INVALID_KEY, path }),
      );

      if (keyResult.isErr) {
        errors.push(keyResult.error);
        continue;
      }

      const valueResult = valueCaster.parse(v, [...path, String(k)]);

      if (valueResult.isErr) {
        errors.push(...valueResult.error);
        continue;
      }

      Object.defineProperty(result, keyResult.value, {
        value: valueResult.value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    return errors.length === 0 ? ok(result) : err(errors);
  };

export const record = <K extends PropertyKey, T>(
  keyCaster: Caster<K>,
  valueCaster: Caster<T>,
  name = `Record<${keyCaster.name}, ${valueCaster.name}>`,
): Caster<Record<K, T>> =>
  fromGuardAndTransform(
    (value): value is Record<K, T> => isObject(value),
    transform(keyCaster, valueCaster),
    name,
    ERR_INVALID_VALUE_TYPE,
    parse(keyCaster, valueCaster),
  );
