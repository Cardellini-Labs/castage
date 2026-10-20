import * as ts from 'typescript';
import { resolve } from 'node:path';
import { GenerationError } from './generation-error.js';
import type { GenerateOptions } from './types.js';

export const compilerOptions = (
  options: GenerateOptions,
): ts.CompilerOptions => ({
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  ...options.compilerOptions,
  strictNullChecks: true,
  noEmit: true,
});

export const createSourceProgram = (
  source: string,
  fileName: string,
  options: GenerateOptions,
): ts.Program => {
  const settings = compilerOptions(options);
  const host = ts.createCompilerHost(settings);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (path) =>
    resolve(path) === fileName ? source : readFile(path);
  host.fileExists = (path) => resolve(path) === fileName || fileExists(path);
  return ts.createProgram([fileName], settings, host);
};

const diagnosticMessage = (diagnostic: ts.Diagnostic): string => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (!diagnostic.file || diagnostic.start === undefined) return message;
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start,
  );
  return `${diagnostic.file.fileName}:${line + 1}:${character + 1}: ${message}`;
};

export const checkedSource = (
  program: ts.Program,
  fileName: string,
): ts.SourceFile => {
  const source = program.getSourceFile(fileName);
  if (!source)
    throw new GenerationError(`Cannot read TypeScript file: ${fileName}`);
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
  if (errors.length) {
    throw new GenerationError(errors.map(diagnosticMessage).join('\n'));
  }
  return source;
};
