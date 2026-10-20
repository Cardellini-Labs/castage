import * as ts from 'typescript';
import { resolve } from 'node:path';
import {
  compilerOptions,
  createSourceProgram,
  checkedSource,
} from './compiler.js';
import { selectDeclarations } from './declarations.js';
import { GenerationError } from './generation-error.js';
import { CodeEmitter } from './code-emitter.js';
import { TypeRegistry } from './type-registry.js';
import { TypeRenderer } from './type-renderer.js';
import type { GenerateOptions } from './types.js';

const generateProgram = (
  program: ts.Program,
  fileName: string,
  options: GenerateOptions,
): string => {
  const source = checkedSource(program, fileName);
  const declarations = selectDeclarations(source, options.types);
  const registry = new TypeRegistry(declarations, program.getTypeChecker());
  const emitter = new CodeEmitter(registry.runtimeName);
  const output = [emitter.import(options.importFrom ?? 'castage')];
  // Rendering queues imported types and concrete generic instantiations as needed.
  for (let index = 0; index < registry.entries.length; index += 1) {
    if (index > declarations.length + 1000) {
      throw new GenerationError(
        'Type dependency expansion exceeds 1000 declarations; recursive generic arguments may keep growing',
      );
    }
    const entry = registry.entries[index];
    const renderer = new TypeRenderer(
      program,
      source,
      emitter,
      registry,
      entry.name,
    );
    output.push(
      emitter.declaration(entry, renderer.definition(entry.type, entry.name)),
    );
  }
  return `${output.join('\n\n')}\n`;
};

/** Generate a standalone TypeScript module of Castage casters from TS source. */
export const generate = (
  source: string,
  options: GenerateOptions = {},
): string => {
  const fileName = resolve(options.fileName ?? 'castage-input.ts');
  return generateProgram(
    createSourceProgram(source, fileName, options),
    fileName,
    options,
  );
};

/** Read a .ts or .d.ts file and resolve its imports without executing it. */
export const generateFile = (
  fileName: string,
  options: GenerateOptions = {},
): string => {
  const path = resolve(fileName);
  return generateProgram(
    ts.createProgram([path], compilerOptions(options)),
    path,
    options,
  );
};
