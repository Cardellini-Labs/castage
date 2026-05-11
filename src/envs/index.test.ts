import { describe, expect, it, jest } from '@jest/globals';
import { ok } from 'resultage';
import { castErr, castingErr } from '../casting-error';
import { json } from '../json';
import { rsaPrivateKey, x509Certificate } from '../pki';
import { string } from '../primitives';
import { struct } from '../struct';
import { text } from '../text';
import {
  apiKey,
  byteSize,
  cloudProvider,
  databaseUrl,
  directoryPath,
  duration,
  email,
  flag,
  filePath,
  hostname,
  ipCidr,
  jwtSecret,
  logLevel,
  port,
  regex,
  region,
  secret,
  token,
  url,
  formatEnvError,
  formatEnvErrors,
  loadEnvs,
  parseEnvs,
} from './index';

const rsaPrivateKeyValue = [
  '-----BEGIN RSA PRIVATE KEY-----',
  'MIIBOgIBAAJBALu9fakekeycontent',
  '-----END RSA PRIVATE KEY-----',
].join('\n');

const x509CertificateValue = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBhTCCASugAwIBAgIUfakecertificatecontent',
  '-----END CERTIFICATE-----',
].join('\n');

describe('envs', () => {
  describe('env-specific casters', () => {
    it.each([
      [port, '3000', 3000],
      [url, 'https://example.com/path', 'https://example.com/path'],
      [hostname, 'api.example.com', 'api.example.com'],
      [email, 'admin@example.com', 'admin@example.com'],
      [jwtSecret, 'x'.repeat(32), 'x'.repeat(32)],
      [filePath, './config/app.json', './config/app.json'],
      [directoryPath, './config/', './config/'],
      [duration, '5m', 300000],
      [byteSize, '5mb', 5 * 1024 * 1024],
      [logLevel, 'warn', 'warn'],
      [ipCidr, '192.168.1.0/24', '192.168.1.0/24'],
      [ipCidr, '::1', '::1'],
      [
        databaseUrl,
        'postgres://user:pass@localhost:5432/db',
        'postgres://user:pass@localhost:5432/db',
      ],
      [region, 'aws:us-east-1', 'aws:us-east-1'],
      [region, 'us-east-1', 'us-east-1'],
      [cloudProvider, 'aws', 'aws'],
      [secret, 's'.repeat(32), 's'.repeat(32)],
      [token, 'token_abc1234567890', 'token_abc1234567890'],
      [apiKey, 'sk_abc1234567890123', 'sk_abc1234567890123'],
    ])('casts %s from %p', (caster, value, expected) => {
      expect(caster(value)).toEqual(ok(expected));
    });

    it('casts env::regex', () => {
      const result = regex('^hello$');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value.test('hello')).toBe(true);
        expect(result.value.test('nope')).toBe(false);
      }
    });

    it.each([
      ['on', true],
      ['On', true],
      ['ON', true],
      ['enabled', true],
      ['Enabled', true],
      ['yes', true],
      ['Yes', true],
      ['true', true],
      ['True', true],
      ['1', true],
      ['off', false],
      ['Off', false],
      ['OFF', false],
      ['disabled', false],
      ['Disabled', false],
      ['no', false],
      ['No', false],
      ['false', false],
      ['False', false],
      ['0', false],
    ])('casts env::flag value %p', (value, expected) => {
      expect(flag(value)).toEqual(ok(expected));
    });

    it.each([
      [port, '0', 'env::port', 0],
      [url, 'example.com', 'env::url', 'example.com'],
      [hostname, 'https://example.com', 'env::hostname', 'https://example.com'],
      [email, 'admin@example', 'env::email', 'admin@example'],
      [jwtSecret, 'short', 'env::jwtSecret', 'short'],
      [filePath, './config/', 'env::filePath', './config/'],
      [directoryPath, '', 'env::directoryPath', ''],
      [duration, '5w', 'env::duration', '5w'],
      [byteSize, '5xb', 'env::byteSize', '5xb'],
      [logLevel, 'verbose', 'env::logLevel', 'verbose'],
      [ipCidr, '999.1.1.1', 'env::ipCidr', '999.1.1.1'],
      [
        databaseUrl,
        'https://example.com',
        'env::databaseUrl',
        'https://example.com',
      ],
      [flag, 'maybe', 'env::flag', 'maybe'],
      [region, 'us_east_1', 'env::region', 'us_east_1'],
      [cloudProvider, 'digitalocean', 'env::cloudProvider', 'digitalocean'],
      [secret, 'short', 'env::secret', 'short'],
      [token, 'short', 'env::token', 'short'],
      [apiKey, 'tokenabc1234567890', 'env::apiKey', 'tokenabc1234567890'],
      [regex, '[', 'env::regex', '['],
    ])(
      'returns err(ERR_INVALID_VALUE) for invalid %s value %p',
      (caster, value, expected, received) => {
        const result = caster(value);

        expect(result.isErr).toBe(true);
        if (result.isErr) {
          expect(result.error.extra.expected).toBe(expected);
          expect(result.error.extra.received).toEqual(received);
        }
      },
    );
  });

  describe('parseEnvs', () => {
    const Config = struct({
      HOSTNAME: hostname,
      PORT: port,
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL: email,
      JWT_SECRET: jwtSecret,
      LOG_LEVEL: logLevel,
      REQUEST_TIMEOUT: duration,
      MAX_UPLOAD: byteSize,
      SERVICE_NAME: string,
      RETRY_COUNT: text.int.default(3),
      FEATURE_FLAGS: json.default({}),
      RSA_PRIVATE_KEY: rsaPrivateKey,
      TLS_CERTIFICATE: x509Certificate,
    });

    it('parses an explicit env source', () => {
      expect(
        parseEnvs(Config, {
          HOSTNAME: 'api.example.com',
          PORT: '3000',
          DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
          ADMIN_EMAIL: 'admin@example.com',
          JWT_SECRET: 'x'.repeat(32),
          LOG_LEVEL: 'info',
          REQUEST_TIMEOUT: '30s',
          MAX_UPLOAD: '10mb',
          SERVICE_NAME: 'api',
          RETRY_COUNT: '5',
          FEATURE_FLAGS: '{"preview":true}',
          RSA_PRIVATE_KEY: rsaPrivateKeyValue,
          TLS_CERTIFICATE: x509CertificateValue,
        }),
      ).toEqual(
        ok({
          HOSTNAME: 'api.example.com',
          PORT: 3000,
          DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
          ADMIN_EMAIL: 'admin@example.com',
          JWT_SECRET: 'x'.repeat(32),
          LOG_LEVEL: 'info',
          REQUEST_TIMEOUT: 30000,
          MAX_UPLOAD: 10 * 1024 * 1024,
          SERVICE_NAME: 'api',
          RETRY_COUNT: 5,
          FEATURE_FLAGS: { preview: true },
          RSA_PRIVATE_KEY: rsaPrivateKeyValue,
          TLS_CERTIFICATE: x509CertificateValue,
        }),
      );
    });

    it('collects parser errors from caster.parse', () => {
      const result = parseEnvs(Config, {
        HOSTNAME: 'https://localhost',
        PORT: '0',
        DATABASE_URL: 'https://example.com',
        ADMIN_EMAIL: 'admin@example',
        JWT_SECRET: 'short',
        LOG_LEVEL: 'verbose',
        REQUEST_TIMEOUT: '30w',
        MAX_UPLOAD: '10xb',
        SERVICE_NAME: 'api',
        RETRY_COUNT: 'nope',
        FEATURE_FLAGS: '{',
        RSA_PRIVATE_KEY: 'not a key',
        TLS_CERTIFICATE: 'not a cert',
      });

      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error).toHaveLength(12);
        expect(result.error.map((error) => error.path)).toEqual([
          ['HOSTNAME'],
          ['PORT'],
          ['DATABASE_URL'],
          ['ADMIN_EMAIL'],
          ['JWT_SECRET'],
          ['LOG_LEVEL'],
          ['REQUEST_TIMEOUT'],
          ['MAX_UPLOAD'],
          ['RETRY_COUNT'],
          ['FEATURE_FLAGS'],
          ['RSA_PRIVATE_KEY'],
          ['TLS_CERTIFICATE'],
        ]);
      }
    });

    it('returns a parser error for a non-object env source', () => {
      expect(parseEnvs(Config, null as any)).toEqual(
        castErr('ERR_INVALID_VALUE_TYPE', [], {
          expected: 'envs',
          received: null,
        }).mapErr((error) => [error]),
      );
    });
  });

  describe('formatEnvError', () => {
    it('pretty prints one env parser error', () => {
      expect(
        formatEnvError(
          castingErr('ERR_INVALID_VALUE', ['PORT'], {
            expected: 'env::port',
            received: 'abc',
          }),
        ),
      ).toBe('PORT: expected env::port, received "abc"');
    });

    it('pretty prints missing values without a received value', () => {
      expect(
        formatEnvError(
          castingErr('ERR_MISSING_VALUE', ['HOSTNAME'], {
            expected: 'env::hostname',
          }),
        ),
      ).toBe('HOSTNAME: expected env::hostname');
    });

    it('pretty prints root-level errors', () => {
      expect(
        formatEnvError(
          castingErr('ERR_INVALID_VALUE_TYPE', [], {
            expected: 'envs',
            received: null,
          }),
        ),
      ).toBe('<env>: expected envs, received null');
    });

    it('pretty prints error reasons', () => {
      expect(
        formatEnvError(
          castingErr('ERR_INVALID_VALUE', ['PATTERN'], {
            expected: 'env::regex',
            received: '[',
            reason: 'Invalid regular expression',
          }),
        ),
      ).toBe(
        'PATTERN: expected env::regex, received "[" ' +
          '(Invalid regular expression)',
      );
    });
  });

  describe('formatEnvErrors', () => {
    it('pretty prints multiple env parser errors', () => {
      expect(
        formatEnvErrors([
          castingErr('ERR_INVALID_VALUE', ['PORT'], {
            expected: 'env::port',
            received: 'abc',
          }),
          castingErr('ERR_MISSING_VALUE', ['HOSTNAME'], {
            expected: 'env::hostname',
          }),
        ]),
      ).toBe(
        [
          'Invalid environment variables:',
          '- PORT: expected env::port, received "abc"',
          '- HOSTNAME: expected env::hostname',
        ].join('\n'),
      );
    });
  });

  describe('loadEnvs', () => {
    const Config = struct({
      HOSTNAME: hostname,
      PORT: port,
    });

    it('returns parsed values for valid envs', () => {
      expect(loadEnvs(Config, { HOSTNAME: 'localhost', PORT: '3000' })).toEqual(
        { HOSTNAME: 'localhost', PORT: 3000 },
      );
    });

    it('prints errors and exits for invalid envs when process.exit is available', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const processExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit(${code})`);
        });

      expect(() =>
        loadEnvs(Config, { HOSTNAME: 'localhost', PORT: 'abc' }),
      ).toThrow('process.exit(1)');
      expect(consoleError).toHaveBeenCalledWith(
        'Invalid environment variables:\n' +
          '- PORT: expected text::int, received "abc"',
      );
      expect(processExit).toHaveBeenCalledWith(1);

      processExit.mockRestore();
      consoleError.mockRestore();
    });

    it('throws AggregateError with raw parser errors when process.exit is unavailable', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const processDescriptor = Object.getOwnPropertyDescriptor(
        globalThis,
        'process',
      );

      Object.defineProperty(globalThis, 'process', {
        configurable: true,
        value: undefined,
      });

      try {
        expect(() =>
          loadEnvs(Config, { HOSTNAME: 'localhost', PORT: 'abc' }),
        ).toThrow(AggregateError);

        try {
          loadEnvs(Config, { HOSTNAME: 'localhost', PORT: 'abc' });
        } catch (error) {
          expect(error).toBeInstanceOf(AggregateError);
          expect((error as AggregateError).errors).toHaveLength(1);
          expect((error as AggregateError).errors[0].path).toEqual(['PORT']);
        }
      } finally {
        if (processDescriptor === undefined) {
          delete (globalThis as { process?: NodeJS.Process }).process;
        } else {
          Object.defineProperty(globalThis, 'process', processDescriptor);
        }

        consoleError.mockRestore();
      }
    });
  });
});
