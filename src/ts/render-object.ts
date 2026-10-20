import * as ts from 'typescript';
import type { RenderContext, RenderedType } from './types.js';

interface RenderedField extends RenderedType {
  requiredAssignment?: string;
}

const renderField = (
  property: ts.Symbol,
  context: RenderContext,
): RenderedField => {
  const declaration = property.valueDeclaration ?? property.declarations?.[0];
  const type = context.checker.getTypeOfSymbolAtLocation(
    property,
    declaration ?? context.source,
  );
  const member = context.render(type);
  const key = JSON.stringify(property.name);
  const optional = Boolean(property.flags & ts.SymbolFlags.Optional);
  const acceptsUndefined = context.checker.isTypeAssignableTo(
    context.checker.getUndefinedType(),
    type,
  );
  return {
    code: `[${key}]: ${member.code}${optional ? '.optional' : ''}`,
    type: `${key}${optional ? '?' : ''}: ${member.type}`,
    requiredAssignment:
      !optional && acceptsUndefined ? `[${key}]: data[${key}]` : undefined,
  };
};

const renderStruct = (
  properties: ts.Symbol[],
  context: RenderContext,
  name?: string,
): RenderedType => {
  const fields = properties.map((property) => renderField(property, context));
  const args = [`{ ${fields.map((field) => field.code).join(', ')} }`];
  if (name !== undefined) args.push(JSON.stringify(name));
  const code = context.emitter.call('struct', ...args);
  const required = fields.flatMap((field) =>
    field.requiredAssignment ? [field.requiredAssignment] : [],
  );
  return {
    // struct infers fields accepting undefined as optional; restore required keys.
    code: required.length
      ? `${code}.map((data) => ({ ...data, ${required.join(', ')} }))`
      : code,
    type: `{ ${fields.map((field) => field.type).join('; ')} }`,
  };
};

const renderIndex = (
  index: ts.IndexInfo,
  type: ts.Type,
  context: RenderContext,
): RenderedType => {
  const numeric = Boolean(index.keyType.flags & ts.TypeFlags.Number);
  if (!numeric && !(index.keyType.flags & ts.TypeFlags.String)) {
    return context.unsupported(
      type,
      'Only string and number index signatures are supported',
    );
  }
  const member = context.render(index.type);
  const keyCaster = numeric ? 'possibleText.number' : 'string';
  return {
    code: context.emitter.call(
      'record',
      `${context.emitter.runtime}.${keyCaster}`,
      member.code,
    ),
    type: `{ [key: ${numeric ? 'number' : 'string'}]: ${member.type} }`,
  };
};

export const renderObject = (
  type: ts.Type,
  context: RenderContext,
  name?: string,
): RenderedType => {
  if (!(type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection))) {
    return context.unsupported(type, 'Unsupported TypeScript type');
  }
  if (type.getCallSignatures().length || type.getConstructSignatures().length) {
    return context.unsupported(
      type,
      'Callable and constructable types are not supported',
    );
  }
  const properties = context.checker.getPropertiesOfType(type);
  const indexes = context.checker.getIndexInfosOfType(type);
  if (!properties.length && !indexes.length) {
    return context.emitter.guard('{}', 'value !== null && value !== undefined');
  }
  const parts: RenderedType[] = [];
  if (properties.length) {
    for (const property of properties) {
      if (String(property.escapedName).startsWith('__@')) {
        return context.unsupported(type, 'Symbol properties are not supported');
      }
    }
    parts.push(renderStruct(properties, context, name));
  }
  for (const index of indexes) parts.push(renderIndex(index, type, context));
  return parts.length === 1
    ? parts[0]
    : context.emitter.combine('allOf', parts);
};
