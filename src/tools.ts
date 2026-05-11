export const propertyKeys = <T extends object>(obj: T) =>
  [
    ...Object.getOwnPropertyNames(obj),
    ...Object.getOwnPropertySymbols(obj),
  ] as (keyof T)[];

export const hasOwn = <
  T extends Record<PropertyKey, unknown>,
  K extends PropertyKey,
  // eslint-disable-next-line @typescript-eslint/ban-types
>(
  obj: T,
  key: K,
): obj is T & Record<K, T[K] & {}> =>
  // eslint-disable-line @typescript-eslint/ban-types
  Object.prototype.hasOwnProperty.call(obj, key);
