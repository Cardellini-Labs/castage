import { Caster, OkType } from './types.js';

type CasterFactory<Args extends any[], R> = (...args: Args) => Caster<R>;

type WrappedFactory<F extends CasterFactory<any, any>> = (
  ...args: Parameters<F>
) => Caster<OkType<ReturnType<F>>>;

export interface Deserializer<P> extends Caster<P> {
  to<T>(caster: Caster<T>): Caster<T>;
  to<F extends CasterFactory<any, any>>(factory: F): WrappedFactory<F>;
}

export const deserialize = <P>(parser: Caster<P>): Deserializer<P> => {
  const result = parser as any;

  result.to = (target: any) => {
    if (typeof target === 'function' && 'chain' in target) {
      const caster = target as Caster<any>;
      const name = `${parser.name} |> ${caster.name}`;
      return parser.chain(caster, name);
    }

    return (...args: any[]) => {
      const caster = target(...args);
      const name = `${parser.name} |> ${caster.name}`;
      return parser.chain(caster, name);
    };
  };

  return result as Deserializer<P>;
};
