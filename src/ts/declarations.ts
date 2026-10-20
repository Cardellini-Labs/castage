import * as ts from 'typescript';
import { GenerationError } from './generation-error.js';
import type { TypeDeclaration } from './types.js';

const isTypeDeclaration = (node: ts.Node): node is TypeDeclaration =>
  ts.isInterfaceDeclaration(node) ||
  ts.isTypeAliasDeclaration(node) ||
  ts.isEnumDeclaration(node);

const isGeneric = (node: TypeDeclaration): boolean =>
  !ts.isEnumDeclaration(node) && Boolean(node.typeParameters?.length);

const findDeclaration = (
  declarations: TypeDeclaration[],
  name: string,
): TypeDeclaration => {
  const declaration = declarations.find((node) => node.name.text === name);
  if (!declaration)
    throw new GenerationError(`Type declaration not found: ${name}`);
  return declaration;
};

export const selectDeclarations = (
  source: ts.SourceFile,
  names?: readonly string[],
): TypeDeclaration[] => {
  const declarations = source.statements.filter(isTypeDeclaration);
  const selected = names
    ? names.map((name) => findDeclaration(declarations, name))
    : declarations.filter((node) => !isGeneric(node));
  if (!selected.length)
    throw new GenerationError('No concrete type declarations to generate');
  for (const declaration of selected) {
    if (isGeneric(declaration)) {
      throw new GenerationError(
        `Generic type ${declaration.name.text} needs concrete type arguments`,
      );
    }
  }
  return selected;
};
