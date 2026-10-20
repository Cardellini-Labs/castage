import { casterApi } from './engine.js';
import type { Caster } from './types.js';

export const ref = <T>(resolve: () => Caster<T>, name?: string): Caster<T> => {
  const state = {
    get caster(): Caster<T> {
      const caster = resolve();
      Object.defineProperty(state, 'caster', { value: caster });
      return caster;
    },
  };

  return casterApi<T>(
    (value, path) => state.caster(value, path),
    name ?? (() => state.caster.name),
    (value, path) => state.caster.parse(value, path),
  );
};
