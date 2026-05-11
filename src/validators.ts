type Predicate<T> = (value: T) => boolean;
type Lengthwise = { length: number };

const named = <T extends Predicate<any>>(name: string, predicate: T): T =>
  Object.defineProperty(predicate, 'name', {
    configurable: true,
    value: name,
  });

export const and = <T>(...predicates: Predicate<T>[]): Predicate<T> =>
  named(
    `(${predicates.map((predicate) => predicate.name).join(' & ')})`,
    (value: T): boolean => predicates.every((predicate) => predicate(value)),
  );

export const or = <T>(...predicates: Predicate<T>[]): Predicate<T> =>
  named(
    `(${predicates.map((predicate) => predicate.name).join(' | ')})`,
    (value: T): boolean => predicates.some((predicate) => predicate(value)),
  );

export const not = <T>(predicate: Predicate<T>): Predicate<T> =>
  named(`!${predicate.name}`, (value: T): boolean => !predicate(value));

export const finite = named('finite', (value: number): boolean =>
  Number.isFinite(value),
);

export const safeInteger = named('safeInteger', (value: number): boolean =>
  Number.isSafeInteger(value),
);

export const positive = named(
  'positive',
  (value: number): boolean => value > 0,
);

export const negative = named(
  'negative',
  (value: number): boolean => value < 0,
);

export const nonPositive = named(
  'nonPositive',
  (value: number): boolean => value <= 0,
);

export const nonNegative = named(
  'nonNegative',
  (value: number): boolean => value >= 0,
);

export const even = named(
  'even',
  (value: number): boolean => Number.isInteger(value) && value % 2 === 0,
);

export const odd = named(
  'odd',
  (value: number): boolean => Number.isInteger(value) && value % 2 !== 0,
);

export const min = (minValue: number): Predicate<number> =>
  named(`min(${minValue})`, (value: number): boolean => value >= minValue);

export const greaterThan = (minValue: number): Predicate<number> =>
  named(
    `greaterThan(${minValue})`,
    (value: number): boolean => value > minValue,
  );

export const max = (maxValue: number): Predicate<number> =>
  named(`max(${maxValue})`, (value: number): boolean => value <= maxValue);

export const lessThan = (maxValue: number): Predicate<number> =>
  named(`lessThan(${maxValue})`, (value: number): boolean => value < maxValue);

export const between = (
  minValue: number,
  maxValue: number,
): Predicate<number> =>
  named(
    `between(${minValue}, ${maxValue})`,
    (value: number): boolean => value >= minValue && value <= maxValue,
  );

export const multipleOf = (divisor: number): Predicate<number> =>
  named(
    `multipleOf(${divisor})`,
    (value: number): boolean => divisor !== 0 && value % divisor === 0,
  );

export const empty = named(
  'empty',
  (value: Lengthwise): boolean => value.length === 0,
);

export const nonEmpty = named(
  'nonEmpty',
  (value: Lengthwise): boolean => value.length > 0,
);

export const lengthOf = (size: number): Predicate<Lengthwise> =>
  named(
    `length(${size})`,
    (value: Lengthwise): boolean => value.length === size,
  );

export const minLength = (minSize: number): Predicate<Lengthwise> =>
  named(
    `minLength(${minSize})`,
    (value: Lengthwise): boolean => value.length >= minSize,
  );

export const maxLength = (maxSize: number): Predicate<Lengthwise> =>
  named(
    `maxLength(${maxSize})`,
    (value: Lengthwise): boolean => value.length <= maxSize,
  );

export const lengthBetween = (
  minSize: number,
  maxSize: number,
): Predicate<Lengthwise> =>
  named(
    `lengthBetween(${minSize}, ${maxSize})`,
    (value: Lengthwise): boolean =>
      value.length >= minSize && value.length <= maxSize,
  );

export const nonBlank = named(
  'nonBlank',
  (value: string): boolean => value.trim().length > 0,
);

export const matches = (pattern: RegExp): Predicate<string> =>
  named(`matches(${pattern})`, (value: string): boolean => pattern.test(value));

export const startsWith = (searchString: string): Predicate<string> =>
  named(
    `startsWith(${JSON.stringify(searchString)})`,
    (value: string): boolean => value.startsWith(searchString),
  );

export const endsWith = (searchString: string): Predicate<string> =>
  named(`endsWith(${JSON.stringify(searchString)})`, (value: string): boolean =>
    value.endsWith(searchString),
  );

export const includes = (searchString: string): Predicate<string> =>
  named(`includes(${JSON.stringify(searchString)})`, (value: string): boolean =>
    value.includes(searchString),
  );

export const email = named('email', (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
);

export const url = named('url', (value: string): boolean => {
  try {
    new URL(value);

    return true;
  } catch {
    return false;
  }
});

export const uuid = named('uuid', (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  ),
);

export const contains = <T>(expected: T): Predicate<readonly T[]> =>
  named(
    `contains(${JSON.stringify(expected)})`,
    (value: readonly T[]): boolean => value.includes(expected),
  );

export const hasNoDuplicates = named(
  'hasNoDuplicates',
  (value: readonly unknown[]): boolean => new Set(value).size === value.length,
);

export const unique = hasNoDuplicates;
