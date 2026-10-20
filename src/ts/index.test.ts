import { describe, expect, it } from '@jest/globals';
import * as ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as castage from '../index';
import { generate, generateFile, GenerationError } from './index';

/** Type-check the actual output, then execute its compiled CommonJS module. */
const compile = (code: string): Record<string, castage.Caster<any>> => {
  const fileName = resolve('src/ts/generated-fixture.ts');
  const options: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    skipLibCheck: true,
    noEmit: true,
    baseUrl: process.cwd(),
    paths: { castage: ['src/index.ts'] },
  };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  host.readFile = (path) =>
    resolve(path) === fileName ? code : readFile(path);
  const program = ts.createProgram([fileName], options, host);
  const errors = ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    );
  expect(errors).toEqual([]);
  const compiled = ts.transpileModule(code, { compilerOptions: options });
  const exports: Record<string, castage.Caster<any>> = {};
  const load = (name: string) => {
    expect(name).toBe('castage');
    return castage;
  };
  new Function('require', 'exports', compiled.outputText)(load, exports);
  return exports;
};

describe('castage/ts', () => {
  it('generates executable schemas for data types and resolved utility types', () => {
    const code = generate(`
      interface Base { id: number; }
      interface Box<T> { value: T; }
      export interface User extends Base {
        name: string;
        active: boolean;
        role: 'admin' | 'reader';
        nickname?: string;
        tags: readonly string[];
        point: readonly [number, number];
        metadata: Record<string, number>;
        flags: Record<'a' | 'b', boolean>;
        nullable: string | null;
        box: Box<string>;
      }
      export type Patch = Partial<Pick<User, 'name' | 'active'>>;
      export type WithoutName = Omit<Base & { name: string }, 'name'>;
      export enum Status { Pending, Done = 'done' }
    `);
    const { User, Patch, WithoutName, Status } = compile(code);
    const input = {
      id: 1,
      name: 'Ada',
      active: true,
      role: 'admin',
      tags: ['a'],
      point: [1, 2],
      metadata: { x: 3 },
      flags: { a: true, b: false },
      nullable: null,
      box: { value: 'text' },
    };
    expect(User(input).isOk).toBe(true);
    expect(User({ ...input, id: '1' }).unwrapErr().path).toEqual(['id']);
    expect(User({ ...input, flags: { a: true } }).isErr).toBe(true);
    expect(Patch({}).isOk).toBe(true);
    expect(Patch({ active: 'true' }).isErr).toBe(true);
    expect(WithoutName({ id: 2 }).isOk).toBe(true);
    expect(Status(0).isOk).toBe(true);
    expect(Status('done').isOk).toBe(true);
    expect(Status('invalid').isErr).toBe(true);
    expect(code).not.toContain('type Box<T>');
  });

  it('supports forward, self and mutual recursive references without eager resolution', () => {
    const { Tree, Left, List, A } = compile(
      generate(`
      interface Tree { label: string; children: Tree[]; }
      interface Left { right: Right | null; }
      interface Right { left: Left | null; }
      type List = [number, List?];
      type A = { kind: 'a'; next?: B };
      type B = { kind: 'b'; next?: A };
    `),
    );
    expect(
      Tree({ label: 'root', children: [{ label: 'leaf', children: [] }] }).isOk,
    ).toBe(true);
    expect(
      Tree({
        label: 'root',
        children: [{ label: 42, children: [] }],
      }).unwrapErr().path,
    ).toEqual(['children', '0', 'label']);
    expect(Left({ right: { left: { right: null } } }).isOk).toBe(true);
    expect(List([1, [2, [3]]]).isOk).toBe(true);
    expect(
      A({ kind: 'a', next: { kind: 'b', next: { kind: 'a' } } }).isOk,
    ).toBe(true);
  });

  it('handles primitive aliases, literal values, special types and optional tuple elements', () => {
    const schemas = compile(
      generate(`
      type Text = string;
      type Count = number;
      type Yes = true;
      type No = false;
      type Negative = -2;
      type Nil = null;
      type Missing = undefined;
      type Anything = any;
      type Unknown = unknown;
      type Impossible = never;
      type Big = bigint;
      type BigLiteral = 42n;
      type Sym = symbol;
      type Obj = object;
      type Empty = {};
      type When = Date;
      type Pair = [string, number?];
      type Numeric = { [key: number]: boolean };
      type Mixed = { name: string; [key: string]: string };
      type Required = { a: unknown; b: any; c: string | undefined };
    `),
    );
    for (const [name, value] of Object.entries({
      Text: 'hi',
      Count: 1.5,
      Yes: true,
      No: false,
      Negative: -2,
      Nil: null,
      Missing: undefined,
      Anything: null,
      Unknown: null,
      Big: 42n,
      BigLiteral: 42n,
      Sym: Symbol('a'),
      Obj: [],
      Empty: 42,
      When: new Date(),
      Pair: ['hi'],
      Numeric: { 1: true },
      Mixed: { name: 'x', more: 'y' },
      Required: { a: 1, b: null, c: undefined },
    })) {
      expect(schemas[name](value).isOk).toBe(true);
    }
    expect(schemas.Impossible(null).isErr).toBe(true);
    expect(schemas.When('2026-01-01').isErr).toBe(true);
    expect(schemas.Numeric({ nope: true }).isErr).toBe(true);
    expect(schemas.Mixed({ name: 'x', more: 1 }).isErr).toBe(true);
    expect(schemas.Required({}).unwrap()).toEqual({
      a: undefined,
      b: undefined,
      c: undefined,
    });
  });

  it('selects root types and includes private concrete dependencies', () => {
    const code = generate(
      `
      interface Box<T> { value: T; next?: Box<T>; }
      type Unused = () => void;
      type User = Box<string>;
    `,
      { types: ['User'], importFrom: 'castage' },
    );
    const schemas = compile(code);
    expect(Object.keys(schemas)).toEqual(['User']);
    expect(schemas.User({ value: 'hi', next: { value: 'there' } }).isOk).toBe(
      true,
    );
    expect(code).not.toContain('Unused');
  });

  it('reads .ts and .d.ts files, resolving imported and re-exported type dependencies', () => {
    const directory = mkdtempSync(join(tmpdir(), 'castage-ts-'));
    try {
      writeFileSync(
        join(directory, 'base.d.ts'),
        'export interface Base { id: number; next?: Base; }',
      );
      writeFileSync(
        join(directory, 'barrel.ts'),
        'export type { Base } from "./base";',
      );
      const source =
        'import type { Base } from "./barrel"; export type Item = Base & { title: string };';
      for (const extension of ['ts', 'd.ts']) {
        const path = join(directory, `input.${extension}`);
        writeFileSync(path, source);
        const code = generateFile(path);
        const { Item } = compile(code);
        expect(Item({ id: 1, title: 'Hi', next: { id: 2 } }).isOk).toBe(true);
        expect(Item({ id: 'bad', title: 'Hi' }).isErr).toBe(true);
        expect(generate(source, { fileName: path })).toBe(code);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('avoids collisions with runtime imports and built-in type names', () => {
    const schemas = compile(
      generate(`
      type $castage = string;
      type Array = number;
      type Record = string;
      type Date = number;
      type Example = { items: string[]; date: globalThis.Date };
      type Keys = { '__@key': string; 'quote"key': number };
    `),
    );
    expect(schemas.Example({ items: ['x'], date: new Date() }).isOk).toBe(true);
    expect(schemas.Keys({ '__@key': 'x', 'quote"key': 1 }).isOk).toBe(true);
  });

  it.each([
    ['type Bad = () => string;', 'Callable'],
    ['type Bad = [string, ...number[]];', 'Rest tuple'],
    ['type Bad = `prefix-${string}`;', 'Unsupported TypeScript type'],
    ['type Bad = { [key: symbol]: string };', 'index signatures'],
    [
      'type Bad = { [Symbol.iterator](): Iterator<string> };',
      'Symbol properties',
    ],
    ['type Bad = Missing;', "Cannot find name 'Missing'"],
    ['type Bad = ;', 'Type expected'],
  ])('rejects unsupported or invalid source: %s', (source, message) => {
    expect(() => generate(source)).toThrow(message);
  });

  it('reports missing files, missing selections and uninstantiated generic roots', () => {
    expect(() =>
      generateFile('/tmp/castage-file-that-does-not-exist.ts'),
    ).toThrow(GenerationError);
    expect(() => generate('const x = 1;')).toThrow('No concrete type');
    expect(() => generate('type X = number;', { types: ['Missing'] })).toThrow(
      'Type declaration not found',
    );
    expect(() =>
      generate('type Box<T> = { value: T };', { types: ['Box'] }),
    ).toThrow('needs concrete type arguments');
  });
});
