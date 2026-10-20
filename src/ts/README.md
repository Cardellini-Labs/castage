# castage/ts

Generate a standalone TypeScript module of Castage casters from `.ts` or `.d.ts`
type declarations. The input module is inspected with the TypeScript compiler;
it is never executed. The generated module only imports `castage` and does not
need TypeScript at runtime.

Install TypeScript alongside Castage to use the generator:

```sh
npm install --save-dev typescript
```

```ts
import { writeFileSync } from 'node:fs';
import { generate, generateFile } from 'castage/ts';

const code = generate(`
  export interface User {
    id: number;
    name: string;
    role: 'admin' | 'reader';
    manager?: User;
  }
`);

writeFileSync('user.casters.ts', code);

// Or read an existing file and resolve its type imports:
writeFileSync(
  'models.casters.ts',
  generateFile('./models.d.ts', { types: ['User'] }),
);
```

The generated module exports a caster and a structural type under each selected
declaration's name. For example, a simple `interface User { name: string }`
produces:

```ts
import * as $castage from 'castage';

export type User = { name: string };
export const User: $castage.Caster<User> = $castage.struct(
  { name: $castage.string },
  'User',
);
```

Use it like any other Castage schema:

```ts
import { User } from './user.casters.js';

const result = User({ id: 1, name: 'Ada', role: 'admin' });
```

## API

- `generate(source, options?)`: Converts source text to TypeScript code.
- `generateFile(fileName, options?)`: Reads a file and converts its declarations
  to TypeScript code. Returns the code without writing any files.
- `GenerationError`: Thrown for invalid source, missing declarations, and types
  that cannot be represented by the generator.

Both functions accept:

```ts
interface GenerateOptions {
  types?: readonly string[];
  importFrom?: string;
  fileName?: string;
  compilerOptions?: import('typescript').CompilerOptions;
}
```

`types` selects top-level interfaces, type aliases, or enums by name. Without
it, every non-generic top-level type declaration is generated, including private
declarations. Referenced imported types and concrete generic instantiations are
included as private dependencies. Re-exports can be consumed through a local
alias such as `import type { User } from './types'; export type Input = User`.

`importFrom` changes the generated Castage import (default: `castage`). `fileName`
sets the location of source text for resolving relative imports. `generateFile`
uses its first argument for that location.

`compilerOptions` configures module resolution, path aliases, libraries, and
other compiler settings. The generator does not automatically load `tsconfig.json`.
Strict null checking is always enabled to preserve null and undefined unions.
The generator reports TypeScript errors before emitting code.

## Supported types

- Primitive types, string/number/boolean/bigint literals, `null`, `undefined`,
  `void`, `any`, `unknown`, `never`, `bigint`, `symbol`, and `object`.
- Interfaces, object type aliases, optional fields, interface inheritance, and
  object intersections.
- Arrays, readonly arrays, fixed tuples, readonly tuples, and optional tuple
  elements.
- Unions and enums, emitted as literal casters and `oneOf`.
- String and number index signatures. Finite records such as
  `Record<'a' | 'b', number>` become structs with required fields.
- Concrete generic instantiations and utility types that the checker resolves
  into supported shapes, such as `Partial`, `Required`, `Pick`, and `Omit`.
- Forward references, self recursion, and mutual recursion through named
  `ref(() => Target, 'Target')` casters.
- `Date`, checked as an existing `Date` instance without parsing strings.

Generic declarations are templates; instantiate them in a concrete type alias
to generate a caster, for example `type StringBox = Box<string>`.

The output describes structural data shapes. Readonly fields do not freeze the
runtime value, enums become their literal value unions, and runtime parsing uses
the normal Castage behavior: structs strip extra fields, tuples keep the declared
positions, and fields whose casters accept `undefined` can accept missing input.
`number` uses Castage's number caster, which rejects `NaN`.

Functions, constructors, symbol properties, symbol or template index signatures,
rest tuples, unresolved type parameters, and unbounded template literal types
raise `GenerationError`. TypeScript dependencies are optional for users of the
main `castage` entrypoint; only `castage/ts` loads the compiler.
