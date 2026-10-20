import * as ts from 'typescript';
import type { RenderContext, RenderedType } from './types.js';

export const renderPrimitive = (
  type: ts.Type,
  context: RenderContext,
): RenderedType | undefined => {
  const { flags } = type;
  const { emitter } = context;
  if (flags & ts.TypeFlags.Any) return emitter.primitive('any');
  if (flags & ts.TypeFlags.Unknown) return emitter.primitive('unknown');
  if (flags & ts.TypeFlags.Never) return emitter.guard('never', 'false');
  if (flags & ts.TypeFlags.String) return emitter.primitive('string');
  if (flags & ts.TypeFlags.Number) return emitter.primitive('number');
  if (flags & ts.TypeFlags.Boolean) return emitter.primitive('boolean');
  if (flags & ts.TypeFlags.Null) return emitter.primitive('nill', 'null');
  if (flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void))
    return emitter.primitive('undef', 'undefined');
  if (flags & ts.TypeFlags.BigInt)
    return emitter.guard('bigint', 'typeof value === "bigint"');
  if (flags & ts.TypeFlags.ESSymbol)
    return emitter.guard('symbol', 'typeof value === "symbol"');
  if (flags & ts.TypeFlags.NonPrimitive) {
    return emitter.guard(
      'object',
      '(typeof value === "object" && value !== null) || typeof value === "function"',
    );
  }
  return undefined;
};

export const renderLiteral = (
  type: ts.Type,
  context: RenderContext,
): RenderedType | undefined => {
  const { flags } = type;
  if (flags & ts.TypeFlags.BigIntLiteral) {
    const literal = context.checker.typeToString(type);
    return context.emitter.guard(literal, `value === ${literal}`);
  }
  const literalFlags =
    ts.TypeFlags.StringLiteral |
    ts.TypeFlags.NumberLiteral |
    ts.TypeFlags.BooleanLiteral;
  if (!(flags & literalFlags)) return undefined;
  const literal =
    flags & ts.TypeFlags.BooleanLiteral
      ? context.checker.typeToString(type)
      : JSON.stringify(
          (type as ts.StringLiteralType | ts.NumberLiteralType).value,
        );
  return { code: context.emitter.call('value', literal), type: literal };
};

export const renderDate = (
  type: ts.Type,
  context: RenderContext,
): RenderedType | undefined => {
  const symbol = type.getSymbol();
  const isDate =
    symbol?.name === 'Date' &&
    symbol.declarations?.some((node) =>
      context.program.isSourceFileDefaultLibrary(node.getSourceFile()),
    );
  return isDate
    ? context.emitter.guard(
        'globalThis.Date',
        'value instanceof globalThis.Date',
      )
    : undefined;
};
