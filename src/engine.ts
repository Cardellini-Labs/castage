import { Result, err, expect, ok } from 'resultage';
import {
  CastingError,
  CastingErrorCode,
  CasterFn,
  Caster,
  ERR_INVALID_VALUE,
  ERR_INVALID_VALUE_TYPE,
  ParserFn,
} from './types.js';

import { replaceExpected, castingErr, castErr } from './casting-error.js';

type CasterName = string | (() => string);

export const casterApi = <T>(
  casterFn: CasterFn<T>,
  name: CasterName = casterFn.name,
  parser?: ParserFn<T>,
): Caster<T> => {
  const caster = casterFn.bind(null) as Caster<T>;

  return Object.defineProperties(caster, {
    name:
      typeof name === 'string'
        ? { enumerable: true, value: name, writable: false }
        : {
            enumerable: true,
            configurable: true,
            get: () => {
              const value = name();
              Object.defineProperty(caster, 'name', { value, writable: false });
              return value;
            },
          },

    nullable: {
      enumerable: true,
      get: () => {
        const nullable: Caster<T | null> = casterApi(
          (
            value: unknown,
            path: string[] = [],
          ): Result<T | null, CastingError> =>
            value === null
              ? ok(null)
              : casterFn(value, path).mapErr((error) =>
                  replaceExpected(nullable.name, path)(error),
                ),
          () => `${caster.name} | null`,
        );
        return nullable;
      },
    },

    optional: {
      enumerable: true,
      get: () => {
        const optional: Caster<T | undefined> = casterApi(
          (
            value: unknown,
            path: string[] = [],
          ): Result<T | undefined, CastingError> =>
            value === undefined
              ? ok(undefined)
              : casterFn(value, path).mapErr((error) =>
                  replaceExpected(optional.name, path)(error),
                ),
          () => `${caster.name} | undefined`,
        );
        return optional;
      },
    },

    default: {
      enumerable: true,
      value: (
        value: T,
        typeName: CasterName = () => `${caster.name} | undefined`,
      ): Caster<T> => {
        const defaultCaster: Caster<T> = casterApi(
          (data: unknown, path: string[] = []): Result<T, CastingError> =>
            data === undefined
              ? ok(value)
              : casterFn(data, path).mapErr((error) =>
                  replaceExpected(defaultCaster.name, path)(error),
                ),
          typeName,
        );
        return defaultCaster;
      },
    },

    validate: {
      enumerable: true,
      value: <S extends T>(
        predicate: (value: T) => value is S,
        ruleName: CasterName = predicate.name || (() => caster.name),
        error?: (value: T, path: string[]) => CastingError,
      ) => {
        const validated: Caster<S> = casterApi(
          (value: unknown, path: string[] = []): Result<S, CastingError> =>
            casterFn(value, path).chain(
              expect(predicate, (data) =>
                error
                  ? error(data, path)
                  : castingErr(ERR_INVALID_VALUE, path, {
                      expected: validated.name,
                      received: data,
                    }),
              ),
            ),
          ruleName,
        );
        return validated;
      },
    },

    unpack: {
      enumerable: true,
      get:
        () =>
        (value: unknown, path: string[] = []): T =>
          casterFn(value, path).match(
            (data) => data,
            (err) => {
              throw err;
            },
          ),
    },

    unpackOr: {
      enumerable: true,
      value:
        <E>(handleError: (err: CastingError) => E) =>
        (value: unknown, path: string[] = []): T | E =>
          casterFn(value, path).unwrapOrElse(handleError),
    },

    match: {
      enumerable: true,
      value:
        <S, E>(
          okMatcher: (data: T) => S,
          errMatcher: (err: CastingError) => E,
        ) =>
        (value: unknown, path: string[] = []): S | E =>
          casterFn(value, path).match(okMatcher, errMatcher),
    },

    map: {
      enumerable: true,
      value: <S>(
        transform: (data: T) => S,
        typeName: CasterName = () => `(${caster.name} |> ${transform.name})`,
      ): Caster<S> =>
        casterApi(
          (value: unknown, path: string[] = []) =>
            casterFn(value, path).map(transform),
          typeName,
        ),
    },

    chain: {
      enumerable: true,
      value: <S>(
        nextCaster: (data: T, path: string[]) => Result<S, CastingError>,
        typeName: CasterName = () => `(${caster.name} |> ${nextCaster.name})`,
      ): Caster<S> =>
        casterApi(
          (value: unknown, path: string[] = []) =>
            casterFn(value, path).chain((data) =>
              nextCaster(data, [
                ...path.slice(0, -1),
                `${path.at(-1) || ''}::${caster.name}`,
              ]),
            ),
          typeName,
        ),
    },

    parse: {
      enumerable: true,
      value: (
        value: unknown,
        path: string[] = [],
      ): Result<T, CastingError[]> =>
        typeof parser === 'function'
          ? parser(value, path)
          : casterFn(value, path).mapErr((err) => [err]),
    },

    assert: {
      enumerable: true,
      value: (value: unknown): asserts value is T => {
        casterFn(value).unwrap();
      },
    },
  });
};

export const fromGuard = <T>(
  guard: (value: any) => value is T,
  name: string = guard.name,
  errorCode: CastingErrorCode = ERR_INVALID_VALUE_TYPE,
): Caster<T> =>
  casterApi(
    (value, path = []) =>
      guard(value)
        ? ok(value)
        : castErr(errorCode, path, { expected: name, received: value }),
    name,
  );

export const fromGuardAndTransform = <T, S>(
  guard: (value: any) => value is T,
  transform: (value: T, path: string[]) => Result<S, CastingError>,
  name: CasterName = transform.name,
  errorCode: CastingErrorCode = ERR_INVALID_VALUE_TYPE,
  parser?: (value: T, path: string[]) => Result<S, CastingError[]>,
): Caster<S> => {
  const caster: Caster<S> = casterApi(
    (value, path = []) =>
      guard(value)
        ? transform(value, path)
        : castErr(errorCode, path, {
            expected: caster.name,
            received: value,
          }),
    name,
    parser !== undefined
      ? (value, path = []) =>
          guard(value)
            ? parser(value, path)
            : err([
                castingErr(errorCode, path, {
                  expected: caster.name,
                  received: value,
                }),
              ])
      : undefined,
  );
  return caster;
};

export const is =
  <T>(caster: CasterFn<T>) =>
  (value: unknown): value is T =>
    caster(value).isOk;
