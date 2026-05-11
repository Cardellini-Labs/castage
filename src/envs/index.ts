import { Result, err, ok } from 'resultage';
import { castErr, castingErr } from '../casting-error.js';
import { casterApi } from '../engine.js';
import { string } from '../primitives.js';
import { textInt } from '../text.js';
import {
  between,
  email as isEmail,
  includes,
  minLength,
  url as isUrl,
} from '../validators.js';
import {
  type Caster,
  type CastingError,
  ERR_INVALID_VALUE,
  ERR_INVALID_VALUE_TYPE,
} from '../types.js';

export type EnvSource = Record<string, string | undefined>;

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'cloudflare' | 'vercel';
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const hasOwn = <T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> =>
  Object.prototype.hasOwnProperty.call(value, key);

const invalidEnvValue = (
  expected: string,
  received: string,
  path: string[],
): Result<never, CastingError> =>
  castErr(ERR_INVALID_VALUE, path, { expected, received });

const fromStringEnv = <T>(
  name: string,
  transform: (value: string, path: string[]) => Result<T, CastingError>,
): Caster<T> =>
  casterApi(
    (value: unknown, path: string[] = []) =>
      string(value, path).chain((data) => transform(data, path)),
    name,
  );

const ipv4Segment = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const ipv4Pattern = new RegExp(
  `^${ipv4Segment}\\.${ipv4Segment}\\.${ipv4Segment}\\.${ipv4Segment}$`,
);
const ipv6Pattern = /^(?=.*:)[0-9a-f:.]+$/i;
const hostnamePattern =
  /^(localhost|([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i;
const cidrPattern = new RegExp(
  `^(${ipv4Segment}\\.${ipv4Segment}\\.${ipv4Segment}\\.${ipv4Segment})/(\\d|[1-2]\\d|3[0-2])$`,
);

const isHostname = (value: string): boolean => {
  const trimmed = value.trim();

  return (
    trimmed !== '' &&
    trimmed.length <= 253 &&
    !/[\s/:]/.test(trimmed) &&
    hostnamePattern.test(trimmed)
  );
};

const isIpOrCidr = (value: string): boolean => {
  const trimmed = value.trim();

  return (
    ipv4Pattern.test(trimmed) ||
    ipv6Pattern.test(trimmed) ||
    cidrPattern.test(trimmed)
  );
};

const isDatabaseUrl = (value: string): boolean => {
  if (!isUrl(value)) return false;

  const protocol = new URL(value).protocol.replace(/:$/, '');

  return [
    'postgres',
    'postgresql',
    'mysql',
    'mariadb',
    'mongodb',
    'mongodb+srv',
    'redis',
    'rediss',
    'sqlite',
    'sqlserver',
  ].includes(protocol);
};

const isRegion = (value: string): boolean =>
  /^(?:(aws|azure|gcp|cloudflare|vercel):)?[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    value,
  );

const isCloudProvider = (value: string): value is CloudProvider =>
  ['aws', 'azure', 'gcp', 'cloudflare', 'vercel'].includes(value);

const isToken = (value: string): boolean =>
  /^[A-Za-z0-9._~+/=-]{16,}$/.test(value);

const isSecret = (value: string): boolean => value.trim().length >= 32;

const isFilePath = (value: string): boolean =>
  value.trim() !== '' && !value.endsWith('/') && !value.endsWith('\\');

const isDirectoryPath = (value: string): boolean => value.trim() !== '';

const parseDuration = (
  value: string,
  path: string[],
): Result<number, CastingError> => {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);

  if (match === null) return invalidEnvValue('env::duration', value, path);

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return ok(amount * multipliers[unit]);
};

const parseByteSize = (
  value: string,
  path: string[],
): Result<number, CastingError> => {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb|tb)$/i);

  if (match === null) return invalidEnvValue('env::byteSize', value, path);

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4,
  };

  return ok(amount * multipliers[unit]);
};

const parseRegex = (
  value: string,
  path: string[],
): Result<RegExp, CastingError> => {
  try {
    return ok(new RegExp(value));
  } catch (error) {
    return castErr(ERR_INVALID_VALUE, path, {
      expected: 'env::regex',
      received: value,
      reason: (error as Error).message,
    });
  }
};

const parseFlag = (
  value: string,
  path: string[],
): Result<boolean, CastingError> => {
  const normalized = value.trim().toLowerCase();

  if (['on', 'enabled', 'yes', 'true', '1'].includes(normalized)) {
    return ok(true);
  }

  if (['off', 'disabled', 'no', 'false', '0'].includes(normalized)) {
    return ok(false);
  }

  return invalidEnvValue('env::flag', value, path);
};

export const port = textInt.validate(
  between(1, 65535),
  'env::port',
  (value, path) =>
    castingErr(ERR_INVALID_VALUE, path, {
      expected: 'env::port',
      received: value,
    }),
);

export const url = string.validate(isUrl, 'env::url');
export const hostname = string.validate(isHostname, 'env::hostname');
export const email = string.validate(isEmail, 'env::email');
export const jwtSecret = string.validate(minLength(32), 'env::jwtSecret');
export const filePath = string.validate(isFilePath, 'env::filePath');
export const directoryPath = string.validate(
  isDirectoryPath,
  'env::directoryPath',
);
export const duration = fromStringEnv('env::duration', parseDuration);
export const byteSize = fromStringEnv('env::byteSize', parseByteSize);
export const logLevel = string.validate(
  (value): value is LogLevel =>
    ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(value),
  'env::logLevel',
);
export const ipCidr = string.validate(isIpOrCidr, 'env::ipCidr');
export const databaseUrl = string.validate(isDatabaseUrl, 'env::databaseUrl');
export const flag = fromStringEnv('env::flag', parseFlag);
export const region = string.validate(isRegion, 'env::region');
export const cloudProvider = string.validate(
  isCloudProvider,
  'env::cloudProvider',
);
export const secret = string.validate(isSecret, 'env::secret');
export const token = string.validate(isToken, 'env::token');
export const apiKey = string.validate(
  (value) => isToken(value) && includes('_')(value),
  'env::apiKey',
);
export const regex = fromStringEnv('env::regex', parseRegex);

export const formatEnvError = (error: CastingError): string => {
  const envName = error.path.length > 0 ? error.path.join('.') : '<env>';
  const { expected, reason } = error.extra;
  const received = hasOwn(error.extra, 'received')
    ? `, received ${JSON.stringify(error.extra.received)}`
    : '';
  const suffix = reason === undefined ? '' : ` (${reason})`;

  return `${envName}: expected ${expected}${received}${suffix}`;
};

export const formatEnvErrors = (errors: CastingError[]): string =>
  [
    'Invalid environment variables:',
    ...errors.map((error) => `- ${formatEnvError(error)}`),
  ].join('\n');

const getProcessExit = (): ((code: number) => never) | undefined => {
  const maybeProcess = (globalThis as { process?: { exit?: unknown } }).process;

  return typeof maybeProcess?.exit === 'function'
    ? (maybeProcess.exit.bind(maybeProcess) as (code: number) => never)
    : undefined;
};

export const parseEnvs = <T>(
  caster: Caster<T>,
  envs: unknown,
  path: string[] = [],
): Result<T, CastingError[]> => {
  if (envs === null || typeof envs !== 'object') {
    return err([
      castingErr(ERR_INVALID_VALUE_TYPE, path, {
        expected: 'envs',
        received: envs,
      }),
    ]);
  }

  return caster.parse(envs, path);
};

export const loadEnvs = <T>(
  caster: Caster<T>,
  envs: unknown,
  path: string[] = [],
): T => {
  const result = parseEnvs(caster, envs, path);

  if (result.isOk) return result.value;

  const errors = result.error;
  console.error(formatEnvErrors(errors));

  const exit = getProcessExit();
  if (exit !== undefined) exit(1);

  throw new AggregateError(errors, 'Invalid environment variables');
};
