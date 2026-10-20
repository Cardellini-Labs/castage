import type * as ts from 'typescript';
import { GenerationError } from './generation-error.js';
import {
  renderPrimitive,
  renderLiteral,
  renderDate,
} from './render-primitives.js';
import { renderCollection } from './render-collections.js';
import { renderObject } from './render-object.js';
import type { CodeEmitter } from './code-emitter.js';
import type { TypeRegistry } from './type-registry.js';
import type { RenderContext, RenderedType } from './types.js';

/** Renders one declaration; shared references are owned by TypeRegistry. */
export class TypeRenderer implements RenderContext {
  readonly checker: ts.TypeChecker;

  constructor(
    readonly program: ts.Program,
    readonly source: ts.SourceFile,
    readonly emitter: CodeEmitter,
    private readonly registry: TypeRegistry,
    private readonly name: string,
  ) {
    this.checker = program.getTypeChecker();
  }

  render(type: ts.Type): RenderedType {
    const entry = this.registry.reference(type, this.program);
    return entry ? this.emitter.reference(entry) : this.definition(type);
  }

  definition(type: ts.Type, name?: string): RenderedType {
    return (
      renderPrimitive(type, this) ??
      renderLiteral(type, this) ??
      renderCollection(type, this) ??
      renderDate(type, this) ??
      renderObject(type, this, name)
    );
  }

  unsupported(type: ts.Type, reason: string): never {
    throw new GenerationError(
      `${this.name}: ${reason}: ${this.checker.typeToString(type)}`,
    );
  }
}
