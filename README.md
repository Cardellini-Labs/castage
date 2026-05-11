# castage [![Coverage Status](https://coveralls.io/repos/github/DScheglov/castage/badge.svg?branch=main)](https://coveralls.io/github/DScheglov/castage?branch=main) [![npm version](https://img.shields.io/npm/v/castage.svg?style=flat-square)](https://www.npmjs.com/package/castage) [![npm downloads](https://img.shields.io/npm/dm/castage.svg?style=flat-square)](https://www.npmjs.com/package/castage) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/DScheglov/castage/blob/master/LICENSE)

**Castage** is a small TypeScript runtime casting library. You describe the shape of unknown data with composable casters, run those casters at runtime, and get typed values back through [`resultage`](https://www.npmjs.com/package/resultage) `Result` objects.

It is useful at boundaries where TypeScript cannot protect you by itself: JSON payloads, API responses, config files, request parameters, message queues, local storage, and other `unknown` inputs.

## Installation

```bash
npm install castage
```

## Main Features

- **Runtime type checks with static inference**: a `Caster<T>` validates unknown input and narrows the successful result to `T`.
- **Composable schemas**: build object, array, tuple, record, union, and intersection casters from smaller casters.
- **Refinements**: use `.validate(...)` to add domain constraints such as positive numbers, non-blank strings, ranges, or custom predicates.
- **Transforms**: use `.map(...)` and `.chain(...)` to convert successfully cast values into another representation.
- **Optional/default/null handling**: derive `.optional`, `.nullable`, and `.default(...)` casters from any caster.
- **Structured errors**: failed casts return `CastingError` values with an error code, path, expected type, and received value.
- **Single-error or multi-error parsing**: call a caster directly for fail-fast casting, or call `.parse(...)` to collect nested errors where supported.

## Quick Start

```ts
import { array, int, string, struct } from 'castage';
import { nonBlank, positive } from 'castage/validators';

const User = struct({
  id: int.validate(positive),
  name: string.validate(nonBlank),
  roles: array(string),
});

const result = User({
  id: 1,
  name: 'Ada',
  roles: ['admin', 'editor'],
});

if (result.isOk) {
  result.value.id; // number
  result.value.name; // string
  result.value.roles; // string[]
}

if (result.isErr) {
  console.error(result.error.path);
  console.error(result.error.extra);
}
```

A caster is just a function:

```ts
const result = int(42); // Result<number, CastingError>
const failed = string(42); // Result<string, CastingError>
```

## Modeling Data

### Primitives

```ts
import { boolean, int, nill, number, string, undef, unknown } from 'castage';

int(1); // ok(1)
number(1.5); // ok(1.5)
string('text'); // ok('text')
boolean(false); // ok(false)
nill(null); // ok(null)
undef(undefined); // ok(undefined)
unknown({ anything: true }); // ok(...)
```

### Literal Values

```ts
import { value, values } from 'castage';

const Enabled = value('enabled');
const Status = values('draft', 'published', 'archived');
```

### Objects

Use `struct(...)` for fixed object shapes. Missing required fields and invalid nested values include the failing path in the returned error.

```ts
import { int, string, struct } from 'castage';

const User = struct({
  id: int,
  name: string,
});

const result = User({ id: 1, name: 'Alice' });
```

Optional fields are expressed by deriving optional casters:

```ts
const UserPatch = struct({
  name: string.optional,
  age: int.optional,
});
```

### Arrays, Tuples, and Records

```ts
import {
  array,
  boolean,
  int,
  number,
  record,
  string,
  text,
  tuple,
  unknown,
  values,
} from 'castage';

const IntList = array(int);
const Point = tuple(number, number);
const Scores = record(string, int);
const FeatureFlags = record(values('search', 'billing'), boolean);
const Metadata = record(string, unknown); // Record<string, unknown>
const UnknownResponses = record(text.int, unknown);
```

Use `nonEmptyArray(caster)` when the array must contain at least one item.

### Unions and Intersections

Use `oneOf(...)` when several shapes are accepted, and `allOf(...)` when multiple object casters should all apply and merge.

```ts
import { allOf, int, oneOf, string, struct, values } from 'castage';

const Id = oneOf(int, string);

const Entity = allOf(
  struct({ id: Id }),
  struct({ kind: values('user', 'team') }),
);
```

### JSON and Text Casters

Use `json` helpers to parse JSON strings before applying a caster, and `text` helpers to parse primitive values from strings.

```ts
import { json, string, struct, text } from 'castage';

const JsonUser = json.struct({
  name: string,
});

const parsedUser = JsonUser('{"name":"Alice"}');
const parsedInt = text.int('42');
```

### Environment Variables

Use the dedicated `castage/envs` entrypoint for environment-specific constraints and explicit configuration loading. See [src/envs/README.md](src/envs/README.md) for the full API and examples.

### PKI Values

Use `castage/pki` for PEM-encoded RSA keys and X.509 certificates. See [src/pki/README.md](src/pki/README.md) for the full API and examples.

## Deriving TypeScript Types

Use `CastedBy<typeof caster>` to derive the TypeScript type produced by a caster. This keeps the runtime schema and static type in one place, so you do not have to maintain a separate interface that can drift from the actual validation rules.

```ts
import { array, int, string, struct, type CastedBy } from 'castage';
import { nonBlank, positive } from 'castage/validators';

const User = struct({
  id: int.validate(positive),
  name: string.validate(nonBlank),
  email: string.optional,
  roles: array(string),
});

type User = CastedBy<typeof User>;
// {
//   id: number;
//   name: string;
//   email?: string | undefined;
//   roles: string[];
// }
```

This also works with composed casters:

```ts
import { oneOf, string, value, type CastedBy } from 'castage';

const Command = oneOf(value('start'), value('stop'), string);

type Command = CastedBy<typeof Command>; // "start" | "stop" | string
```

`OkType<typeof caster>` is also exported for code that works directly with `CasterFn` values.

## Refinements With Validators

`.validate(predicate, name?)` adds an extra rule after the base caster succeeds. The dedicated `castage/validators` entrypoint provides common reusable predicates; these helpers are intentionally not exported from the main `castage` entrypoint.

```ts
import { int, string } from 'castage';
import { and, between, max, nonBlank, positive } from 'castage/validators';

const PositiveInt = int.validate(positive);
const SizedInt = int.validate(between(1, 10));
const NonBlankString = string.validate(nonBlank);
const PositiveSmallInt = int.validate(and(positive, max(100)));
```

Predicate operators:

- `and(...predicates)`: Ensures every predicate returns `true`.
- `or(...predicates)`: Ensures at least one predicate returns `true`.
- `not(predicate)`: Ensures the predicate returns `false`.

Number validators:

- `finite`, `safeInteger`
- `positive`, `negative`, `nonPositive`, `nonNegative`
- `even`, `odd`
- `min(value)`, `greaterThan(value)`, `max(value)`, `lessThan(value)`
- `between(min, max)`, `multipleOf(divisor)`

String validators:

- `nonBlank`
- `matches(pattern)`
- `startsWith(value)`, `endsWith(value)`, `includes(value)`
- `email`, `url`, `uuid`

Length validators for strings and arrays:

- `empty`, `nonEmpty`
- `lengthOf(size)`, `minLength(size)`, `maxLength(size)`
- `lengthBetween(min, max)`

Array validators:

- `contains(value)`
- `hasNoDuplicates`
- `unique`, an alias for `hasNoDuplicates`

Custom predicates work the same way:

```ts
type Email = string & { __brand: 'Email' };

const isEmail = (value: string): value is Email =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Email = string.validate(isEmail, 'Email');
```

## Transforming Values

Use `.map(...)` for simple transformations and `.chain(...)` when the next step can fail with a `Result`.

```ts
import { string } from 'castage';

const Trimmed = string.map((value) => value.trim(), 'TrimmedString');
```

For common text parsing, use the built-in text casters:

```ts
import { possibleText, text } from 'castage';

text.int('42'); // ok(42)
text.number('1.5'); // ok(1.5)
text.bool('true'); // ok(true)

possibleText.int(42); // ok(42)
possibleText.int('42'); // ok(42)
```

## Error Handling

Calling a caster directly returns one `CastingError` on failure:

```ts
import { isCastingError, string } from 'castage';

const result = string(42, ['name']);

if (result.isErr && isCastingError(result.error)) {
  result.error.code; // "ERR_INVALID_VALUE_TYPE"
  result.error.path; // ["name"]
  result.error.extra.expected; // "string"
  result.error.extra.received; // 42
}
```

Use `.parse(...)` when you want a list of nested errors instead of the first failure:

```ts
const parsed = User.parse({ id: 'bad', name: 1 });

if (parsed.isErr) {
  parsed.error; // CastingError[]
}
```

Use `.unpack` when throwing on invalid data is preferable:

```ts
const id = int.unpack(42); // 42
```

## API Reference

### `Caster<T>`

The main runtime type abstraction. A caster is callable and has helper methods for deriving related casters.

```ts
interface Caster<T> {
  (value: unknown, path?: string[]): Result<T, CastingError>;

  nullable: Caster<T | null>;
  optional: Caster<T | undefined>;
  default(value: T, name?: string): Caster<T>;
  unpack: (value: unknown, path?: string[]) => T;

  validate<S extends T>(
    predicate: (value: T) => value is S,
    name?: string,
    error?: (value: T, path: string[]) => CastingError,
  ): Caster<S>;
  validate(
    predicate: (value: T) => boolean,
    name?: string,
    error?: (value: T, path: string[]) => CastingError,
  ): Caster<T>;

  match<S, E>(
    okMatcher: (data: T) => S,
    errMatcher: (err: CastingError) => E,
  ): (value: unknown, path?: string[]) => S | E;

  unpackOr<E>(
    handleError: (err: CastingError) => E,
  ): (value: unknown, path?: string[]) => T | E;

  map<S>(transform: (data: T) => S, name?: string): Caster<S>;

  chain<S>(
    casterFn: (data: T, path?: string[]) => Result<S, CastingError>,
    name?: string,
  ): Caster<S>;

  parse(value: unknown, path?: string[]): Result<T, CastingError[]>;

  assert(value: unknown, path?: string[]): asserts value is T;
}
```

### Primitive Casters

- `int`
- `number`
- `string`
- `boolean`
- `object`
- `nill`
- `undef`
- `any`
- `unknown`

### Composition Helpers

- `array(caster, name?)`
- `nonEmptyArray(caster, name?)`
- `tuple(...casters)`
- `struct(casters, name?)`
- `record(keyCaster, valueCaster, name?)`
- `oneOf(...casters)`
- `allOf(...casters)`
- `value(value)`
- `values(...values)`

### Date Casters

- `date`: Parses `Date`, `string`, or `number` into a JavaScript `Date`.
- `date.iso`: Parses ISO-like date strings.
- `dateTimeStamp.unix`: Parses a Unix timestamp in seconds.
- `dateTimeStamp.js`: Parses a JavaScript timestamp in milliseconds.

### JSON Casters

- `json`: Parses any valid JSON string.
- `json.object`: Parses JSON and validates that the result is an object.
- `json.struct(casters, name?)`: Parses JSON and validates a structured object.
- `json.array(caster, name?)`: Parses JSON and validates an array.

### Text Casters

- `text.int`
- `text.number`
- `text.bool`
- `possibleText.int`
- `possibleText.number`
- `possibleText.bool`

### Environment Casters

Exported from `castage/envs`. See [src/envs/README.md](src/envs/README.md).

### PKI Casters

Exported from `castage/pki`. See [src/pki/README.md](src/pki/README.md).

### `CastingError`

```ts
interface CastingError extends Error {
  code: CastingErrorCode;
  path: string[];
  extra: {
    expected: string;
    received?: unknown;
    causes?: CastingError[];
    reason?: string;
  };
}
```
