import { describe, it, expect } from '@jest/globals';
import { ok } from 'resultage';
import { array } from './array';
import { castErr } from './casting-error';
import { int, number, string } from './primitives';
import {
  and,
  between,
  contains,
  email,
  empty,
  endsWith,
  even,
  finite,
  greaterThan,
  hasNoDuplicates,
  includes,
  lengthOf,
  lengthBetween,
  lessThan,
  matches,
  max,
  maxLength,
  min,
  minLength,
  multipleOf,
  negative,
  nonNegative,
  nonPositive,
  nonBlank,
  nonEmpty,
  odd,
  or,
  not,
  positive,
  safeInteger,
  startsWith,
  url,
  unique,
  uuid,
} from './validators';

describe('validators', () => {
  describe('predicate operators', () => {
    const positiveEven = and(positive, even);
    const stringWithContent = or(email, url);
    const notEmpty = not(empty);

    it('combines predicates with and', () => {
      expect(positiveEven.name).toBe('(positive & even)');
      expect(positiveEven(2)).toBe(true);
      expect(positiveEven(1)).toBe(false);
      expect(positiveEven(-2)).toBe(false);
    });

    it('combines predicates with or', () => {
      expect(stringWithContent.name).toBe('(email | url)');
      expect(stringWithContent('user@example.com')).toBe(true);
      expect(stringWithContent('https://example.com')).toBe(true);
      expect(stringWithContent('example')).toBe(false);
    });

    it('negates predicates with not', () => {
      expect(notEmpty.name).toBe('!empty');
      expect(notEmpty('content')).toBe(true);
      expect(notEmpty('')).toBe(false);
    });

    it('uses operator names as default validation expected values', () => {
      const positiveEvenNumber = number.validate(positiveEven);

      expect(positiveEvenNumber(1)).toEqual(
        castErr('ERR_INVALID_VALUE', [], {
          expected: '(positive & even)',
          received: 1,
        }),
      );
    });
  });

  describe('number validators', () => {
    const positiveNumber = number.validate(positive);
    const atLeastTen = number.validate(min(10));
    const oneToFive = int.validate(between(1, 5));

    it('uses named validators as default expected values', () => {
      expect(positiveNumber(-1)).toEqual(
        castErr('ERR_INVALID_VALUE', [], {
          expected: 'positive',
          received: -1,
        }),
      );

      expect(atLeastTen(9)).toEqual(
        castErr('ERR_INVALID_VALUE', [], {
          expected: 'min(10)',
          received: 9,
        }),
      );
    });

    it.each([
      [positiveNumber, 1],
      [atLeastTen, 10],
      [oneToFive, 3],
    ])('returns ok for valid numbers', (caster, value) => {
      expect(caster(value)).toEqual(ok(value));
    });

    it.each([
      [finite, 1, true],
      [finite, Number.POSITIVE_INFINITY, false],
      [safeInteger, Number.MAX_SAFE_INTEGER, true],
      [safeInteger, Number.MAX_SAFE_INTEGER + 1, false],
      [negative, -1, true],
      [negative, 0, false],
      [nonPositive, 0, true],
      [nonPositive, 1, false],
      [nonNegative, 0, true],
      [nonNegative, -1, false],
      [even, 2, true],
      [even, 1, false],
      [even, 1.5, false],
      [odd, 3, true],
      [odd, 2, false],
      [odd, 1.5, false],
      [greaterThan(3), 4, true],
      [greaterThan(3), 3, false],
      [max(3), 3, true],
      [max(3), 4, false],
      [lessThan(3), 2, true],
      [lessThan(3), 3, false],
      [multipleOf(3), 6, true],
      [multipleOf(3), 7, false],
      [multipleOf(0), 0, false],
    ])('%s(%p) returns %p', (validator, value, expected) => {
      expect(validator(value)).toBe(expected);
    });
  });

  describe('string validators', () => {
    const username = string.validate(lengthBetween(3, 12));
    const title = string.validate(nonBlank);
    const contactEmail = string.validate(email);

    it.each([
      [username, 'castage'],
      [title, 'Runtime types'],
      [contactEmail, 'user@example.com'],
    ])('returns ok for valid strings', (caster, value) => {
      expect(caster(value)).toEqual(ok(value));
    });

    it.each([
      [username, 'ab', 'lengthBetween(3, 12)'],
      [title, '   ', 'nonBlank'],
      [contactEmail, 'user@example', 'email'],
    ])('returns err for invalid strings', (caster, value, expected) => {
      expect(caster(value)).toEqual(
        castErr('ERR_INVALID_VALUE', [], { expected, received: value }),
      );
    });

    it.each([
      [matches(/^a+$/), 'aaa', true],
      [matches(/^a+$/), 'bbb', false],
      [startsWith('cast'), 'castage', true],
      [startsWith('cast'), 'stage', false],
      [endsWith('age'), 'castage', true],
      [endsWith('age'), 'caster', false],
      [includes('tag'), 'castage', true],
      [includes('tag'), 'caster', false],
      [url, 'https://example.com', true],
      [url, 'not a url', false],
      [uuid, '2f1e7fb7-9d2a-4e1b-a9b6-087be95c2d4c', true],
      [uuid, 'not-a-uuid', false],
    ])('%s(%p) returns %p', (validator, value, expected) => {
      expect(validator(value)).toBe(expected);
    });
  });

  describe('length validators', () => {
    const nonEmptyString = string.validate(nonEmpty);
    const minThreeItems = array(int).validate(minLength(3));

    it('reuses length rules for strings and arrays', () => {
      expect(nonEmptyString('a')).toEqual(ok('a'));
      expect(minThreeItems([1, 2, 3])).toEqual(ok([1, 2, 3]));
    });

    it.each([
      [empty, '', true],
      [empty, 'a', false],
      [nonEmpty, [1], true],
      [nonEmpty, [], false],
      [lengthOf(2), 'ab', true],
      [lengthOf(2), 'abc', false],
      [minLength(2), [1, 2], true],
      [minLength(2), [1], false],
      [maxLength(2), [1, 2], true],
      [maxLength(2), [1, 2, 3], false],
      [lengthBetween(2, 3), 'ab', true],
      [lengthBetween(2, 3), 'abcd', false],
    ])('%s(%p) returns %p', (validator, value, expected) => {
      expect(validator(value)).toBe(expected);
    });
  });

  describe('array validators', () => {
    const includesAdmin = array(string).validate(contains('admin'));
    const uniqueNumbers = array(number).validate(hasNoDuplicates);

    it('returns ok for valid arrays', () => {
      expect(includesAdmin(['user', 'admin'])).toEqual(ok(['user', 'admin']));
      expect(uniqueNumbers([1, 2, 3])).toEqual(ok([1, 2, 3]));
    });

    it('returns err for invalid arrays', () => {
      expect(includesAdmin(['user'])).toEqual(
        castErr('ERR_INVALID_VALUE', [], {
          expected: 'contains("admin")',
          received: ['user'],
        }),
      );

      expect(uniqueNumbers([1, 1])).toEqual(
        castErr('ERR_INVALID_VALUE', [], {
          expected: 'hasNoDuplicates',
          received: [1, 1],
        }),
      );

      expect(array(number).validate(unique, 'unique')([1, 1])).toEqual(
        castErr('ERR_INVALID_VALUE', [], {
          expected: 'unique',
          received: [1, 1],
        }),
      );
    });
  });
});
