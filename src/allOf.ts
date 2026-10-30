import { unwrap, ok } from 'resultage';
import { fromGuardAndTransform } from './engine.js';
import type { Caster, CasterFn } from './types';
import { isObject } from './predicates.js';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Combines multiple casters into a single caster that applies all of them.
 * The resulting caster will validate and transform a value using each of the provided casters,
 * and merge the results into a single object.
 *
 * @template T - A tuple of object types that the casters will handle.
 * @param {...{ [K in keyof T]: Caster<T[K]> }} casters - An array of casters to be combined.
 * @returns {Caster<UnionToIntersection<T[number]>>} A caster that applies all provided casters and merges their results.
 */
export const allOf: {
  <T>(caster: Caster<T>): Caster<T>;
  <T1, T2>(caster1: Caster<T1>, caster2: Caster<T2>): Caster<T1 & T2>;
  <T1, T2, T3>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
  ): Caster<T1 & T2 & T3>;
  <T1, T2, T3, T4>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
  ): Caster<T1 & T2 & T3 & T4>;
  <T1, T2, T3, T4, T5>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
  ): Caster<T1 & T2 & T3 & T4 & T5>;
  <T1, T2, T3, T4, T5, T6>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6>;
  <T1, T2, T3, T4, T5, T6, T7>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7>;
  <T1, T2, T3, T4, T5, T6, T7, T8>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11 & T12>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
  ): Caster<T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11 & T12 & T13>;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
  ): Caster<
    T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11 & T12 & T13 & T14
  >;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15
  >;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16
  >;
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17>(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
    caster20: Caster<T20>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19 &
      T20
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
    T21,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
    caster20: Caster<T20>,
    caster21: Caster<T21>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19 &
      T20 &
      T21
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
    T21,
    T22,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
    caster20: Caster<T20>,
    caster21: Caster<T21>,
    caster22: Caster<T22>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19 &
      T20 &
      T21 &
      T22
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
    T21,
    T22,
    T23,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
    caster20: Caster<T20>,
    caster21: Caster<T21>,
    caster22: Caster<T22>,
    caster23: Caster<T23>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19 &
      T20 &
      T21 &
      T22 &
      T23
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
    T21,
    T22,
    T23,
    T24,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
    caster20: Caster<T20>,
    caster21: Caster<T21>,
    caster22: Caster<T22>,
    caster23: Caster<T23>,
    caster24: Caster<T24>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19 &
      T20 &
      T21 &
      T22 &
      T23 &
      T24
  >;
  <
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
    T21,
    T22,
    T23,
    T24,
    T25,
  >(
    caster1: Caster<T1>,
    caster2: Caster<T2>,
    caster3: Caster<T3>,
    caster4: Caster<T4>,
    caster5: Caster<T5>,
    caster6: Caster<T6>,
    caster7: Caster<T7>,
    caster8: Caster<T8>,
    caster9: Caster<T9>,
    caster10: Caster<T10>,
    caster11: Caster<T11>,
    caster12: Caster<T12>,
    caster13: Caster<T13>,
    caster14: Caster<T14>,
    caster15: Caster<T15>,
    caster16: Caster<T16>,
    caster17: Caster<T17>,
    caster18: Caster<T18>,
    caster19: Caster<T19>,
    caster20: Caster<T20>,
    caster21: Caster<T21>,
    caster22: Caster<T22>,
    caster23: Caster<T23>,
    caster24: Caster<T24>,
    caster25: Caster<T25>,
  ): Caster<
    T1 &
      T2 &
      T3 &
      T4 &
      T5 &
      T6 &
      T7 &
      T8 &
      T9 &
      T10 &
      T11 &
      T12 &
      T13 &
      T14 &
      T15 &
      T16 &
      T17 &
      T18 &
      T19 &
      T20 &
      T21 &
      T22 &
      T23 &
      T24 &
      T25
  >;
} = <T extends object[]>(
  ...casters: {
    [K in keyof T]: Caster<T[K]>;
  }
): Caster<UnionToIntersection<T[number]>> => {
  const name = () => `(${casters.map((c) => c.name).join(' & ')})`;

  return fromGuardAndTransform(
    isObject,
    (value, path) => {
      const resultedValue = {} as UnionToIntersection<T[number]>;

      for (let i = 0; i < casters.length; i += 1) {
        const caster = casters[i] as CasterFn<T[number]>;
        const result = caster(value, path);
        if (result.isErr) return result;

        const v = unwrap(result);
        Object.assign(resultedValue as object, v);
      }

      return ok(resultedValue);
    },
    name,
  );
};
