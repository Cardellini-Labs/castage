import * as ts from 'typescript';
import type { RenderContext, RenderedType } from './types.js';

const tupleElement = (
  member: RenderedType,
  flags: ts.ElementFlags,
): RenderedType => {
  const optional = Boolean(flags & ts.ElementFlags.Optional);
  return {
    code: `${member.code}${optional ? '.optional' : ''}`,
    type: `(${member.type})${optional ? '?' : ''}`,
  };
};

const renderTuple = (
  type: ts.TupleTypeReference,
  context: RenderContext,
): RenderedType => {
  const { elementFlags, readonly } = type.target;
  if (elementFlags.some((flag) => flag & ts.ElementFlags.Variable)) {
    return context.unsupported(type, 'Rest tuple elements are not supported');
  }
  const members = context.checker
    .getTypeArguments(type)
    .map((item, index) =>
      tupleElement(context.render(item), elementFlags[index]),
    );
  return {
    code: context.emitter.call(
      'tuple',
      ...members.map((member) => member.code),
    ),
    type: `${readonly ? 'readonly ' : ''}[${members.map((member) => member.type).join(', ')}]`,
  };
};

const renderArray = (
  type: ts.TypeReference,
  context: RenderContext,
): RenderedType => {
  const [item] = context.checker.getTypeArguments(type);
  const member = context.render(item);
  return {
    code: context.emitter.call('array', member.code),
    type: `(${member.type})[]`,
  };
};

export const renderCollection = (
  type: ts.Type,
  context: RenderContext,
): RenderedType | undefined => {
  if (type.isUnion()) {
    return context.emitter.combine(
      'oneOf',
      type.types.map((member) => context.render(member)),
    );
  }
  if (context.checker.isTupleType(type))
    return renderTuple(type as ts.TupleTypeReference, context);
  if (context.checker.isArrayType(type))
    return renderArray(type as ts.TypeReference, context);
  return undefined;
};
