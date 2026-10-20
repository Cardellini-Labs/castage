import * as ts from 'typescript';
import type { TypeDeclaration, TypeEntry } from './types.js';

/** Allocates names and queues each referenced type for a single declaration. */
export class TypeRegistry {
  readonly entries: TypeEntry[] = [];
  readonly runtimeName: string;
  private readonly references = new Map<ts.Type, TypeEntry>();
  private readonly names: Set<string>;

  constructor(declarations: TypeDeclaration[], checker: ts.TypeChecker) {
    this.names = new Set(declarations.map((node) => node.name.text));
    this.runtimeName = this.uniqueName('$castage');
    for (const declaration of declarations) {
      const name = declaration.name.text;
      if (this.entries.some((entry) => entry.name === name)) continue;
      this.add(checker.getTypeAtLocation(declaration.name), name, true);
    }
  }

  private uniqueName(base: string): string {
    let name = base;
    let index = 2;
    while (this.names.has(name)) name = `${base}${index++}`;
    this.names.add(name);
    return name;
  }

  private add(type: ts.Type, name: string, exported: boolean): TypeEntry {
    const entry = { name, type, exported };
    this.entries.push(entry);
    if (!this.references.has(type)) this.references.set(type, entry);
    return entry;
  }

  reference(type: ts.Type, program: ts.Program): TypeEntry | undefined {
    // Primitive aliases share compiler type identities; emit them directly.
    const composite =
      ts.TypeFlags.Object | ts.TypeFlags.Union | ts.TypeFlags.Intersection;
    if (!(type.flags & composite)) return undefined;
    const existing = this.references.get(type);
    if (existing) return existing;
    const symbol = type.aliasSymbol ?? type.getSymbol();
    const declaration = symbol?.declarations?.[0];
    if (
      !symbol ||
      !declaration ||
      program.isSourceFileDefaultLibrary(declaration.getSourceFile())
    ) {
      return undefined;
    }
    if (
      !ts.isTypeAliasDeclaration(declaration) &&
      !ts.isInterfaceDeclaration(declaration)
    ) {
      return undefined;
    }
    return this.add(type, this.uniqueName(symbol.name), false);
  }
}
