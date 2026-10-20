import type * as ts from 'typescript';
import type { CodeEmitter } from './code-emitter.js';

export interface GenerateOptions {
  /** Names of top-level declarations to generate. Defaults to all non-generic types. */
  types?: readonly string[];
  /** Module used by the generated runtime import. Defaults to castage. */
  importFrom?: string;
  /** Used to resolve relative imports when generating from source text. */
  fileName?: string;
  compilerOptions?: ts.CompilerOptions;
}

export type TypeDeclaration =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration;

export interface RenderedType {
  code: string;
  type: string;
}

export interface TypeEntry {
  name: string;
  type: ts.Type;
  exported: boolean;
}

/** Services shared by the type-specific renderers. */
export interface RenderContext {
  program: ts.Program;
  checker: ts.TypeChecker;
  source: ts.SourceFile;
  emitter: CodeEmitter;
  render(type: ts.Type): RenderedType;
  unsupported(type: ts.Type, reason: string): never;
}
