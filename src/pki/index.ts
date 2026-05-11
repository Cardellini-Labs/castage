import { Result, ok } from 'resultage';
import { castErr } from '../casting-error.js';
import { casterApi } from '../engine.js';
import { string } from '../primitives.js';
import { type Caster, type CastingError, ERR_INVALID_VALUE } from '../types.js';

const invalidPkiValue = (
  expected: string,
  received: string,
  path: string[],
): Result<never, CastingError> =>
  castErr(ERR_INVALID_VALUE, path, { expected, received });

const fromStringPki = <T>(
  name: string,
  transform: (value: string, path: string[]) => Result<T, CastingError>,
): Caster<T> =>
  casterApi(
    (value: unknown, path: string[] = []) =>
      string(value, path).chain((data) => transform(data, path)),
    name,
  );

const normalizePem = (value: string): string => value.replace(/\\n/g, '\n');

const pemPattern = (label: string): RegExp =>
  new RegExp(
    `^-----BEGIN ${label}-----\\n[\\s\\S]+\\n-----END ${label}-----\\n?$`,
  );

const rsaPrivateKeyPattern = pemPattern('RSA PRIVATE KEY');
const rsaPublicKeyPatterns = [
  pemPattern('RSA PUBLIC KEY'),
  pemPattern('PUBLIC KEY'),
];
const x509CertificatePattern = pemPattern('CERTIFICATE');

const normalizeRsaPrivateKey = (
  value: string,
  path: string[],
): Result<string, CastingError> => {
  const normalized = normalizePem(value);

  return rsaPrivateKeyPattern.test(normalized)
    ? ok(normalized)
    : invalidPkiValue('pki::rsaPrivateKey', value, path);
};

const normalizeRsaPublicKey = (
  value: string,
  path: string[],
): Result<string, CastingError> => {
  const normalized = normalizePem(value);

  return rsaPublicKeyPatterns.some((pattern) => pattern.test(normalized))
    ? ok(normalized)
    : invalidPkiValue('pki::rsaPublicKey', value, path);
};

const normalizeX509Certificate = (
  value: string,
  path: string[],
): Result<string, CastingError> => {
  const normalized = normalizePem(value);

  return x509CertificatePattern.test(normalized)
    ? ok(normalized)
    : invalidPkiValue('pki::x509Certificate', value, path);
};

export const rsaPrivateKey = fromStringPki(
  'pki::rsaPrivateKey',
  normalizeRsaPrivateKey,
);
export const rsaPublicKey = fromStringPki(
  'pki::rsaPublicKey',
  normalizeRsaPublicKey,
);
export const x509Certificate = fromStringPki(
  'pki::x509Certificate',
  normalizeX509Certificate,
);
