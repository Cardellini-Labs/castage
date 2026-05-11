# castage/envs

Use the dedicated `castage/envs` entrypoint for environment-specific constraints. These casters are built from the normal Castage primitives and text casters, but focus on values that commonly appear in configuration: ports, hosts, URLs, secrets, regions, durations, and byte sizes.

These helpers never read `process.env` directly. Pass the source object yourself so configuration loading stays explicit and easy to test.

```ts
import { json, string, struct, text, type CastedBy } from 'castage';
import {
  byteSize,
  databaseUrl,
  duration,
  email,
  hostname,
  jwtSecret,
  loadEnvs,
  logLevel,
  parseEnvs,
  port,
} from 'castage/envs';
import { rsaPrivateKey, x509Certificate } from 'castage/pki';

const Config = struct({
  HOSTNAME: hostname,
  PORT: port.default(3000),
  DATABASE_URL: databaseUrl,
  ADMIN_EMAIL: email,
  JWT_SECRET: jwtSecret,
  REQUEST_TIMEOUT: duration.default(30_000),
  MAX_UPLOAD: byteSize,
  LOG_LEVEL: logLevel.default('info'),
  SERVICE_NAME: string,
  RETRY_COUNT: text.int.default(3),
  FLAGS: json.default({}),
  RSA_PRIVATE_KEY: rsaPrivateKey,
  TLS_CERTIFICATE: x509Certificate,
});

type Config = CastedBy<typeof Config>;

const source = {
  HOSTNAME: 'localhost',
  PORT: '8080',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
  ADMIN_EMAIL: 'admin@example.com',
  JWT_SECRET: 'use-at-least-32-characters-here',
  REQUEST_TIMEOUT: '30s',
  MAX_UPLOAD: '10mb',
  LOG_LEVEL: 'info',
  SERVICE_NAME: 'api',
  RETRY_COUNT: '5',
  FLAGS: '{"preview":true}',
  RSA_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----',
  TLS_CERTIFICATE: '-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----',
};

const parsed = parseEnvs(Config, source);

const config = loadEnvs(Config, source);
config.PORT; // number
```

## Casters

- `port`: Parses a TCP port from `1` to `65535`.
- `url`: Ensures a URL string.
- `hostname`: Ensures a hostname or `localhost`.
- `email`: Ensures an email address shape.
- `jwtSecret`: Ensures a secret string of at least 32 characters.
- `filePath`: Ensures a non-empty value that does not end with a path separator.
- `directoryPath`: Ensures a non-empty directory path value.
- `duration`: Parses `ms`, `s`, `m`, `h`, or `d` into milliseconds.
- `byteSize`: Parses `b`, `kb`, `mb`, `gb`, or `tb` into bytes.
- `logLevel`: Ensures `trace`, `debug`, `info`, `warn`, `error`, or `fatal`.
- `ipCidr`: Ensures an IPv4 address, IPv6 address, or IPv4 CIDR.
- `databaseUrl`: Ensures a database connection URL for common database protocols.
- `flag`: Parses `on/off`, `enabled/disabled`, `yes/no`, `true/false`, or `1/0` into a boolean.
- `region`: Ensures a region such as `us-east-1`, with optional provider prefix such as `aws:us-east-1`.
- `cloudProvider`: Ensures `aws`, `azure`, `gcp`, `cloudflare`, or `vercel`.
- `secret`: Ensures a secret-like string of at least 32 characters.
- `token`: Ensures a token-like string with at least 16 supported token characters.
- `apiKey`: Ensures a token-like API key containing an underscore prefix separator.
- `regex`: Compiles a JavaScript `RegExp`.

For generic environment values, use existing Castage casters such as `string`, `text.int`, `text.number`, `text.bool`, and `json`. The env entrypoint intentionally does not re-export or alias those primitives.

## Helpers

- `parseEnvs(caster, envs, path?)`: Calls `caster.parse(...)` against an explicit env source and returns `Result<T, CastingError[]>`.
- `loadEnvs(caster, envs, path?)`: Returns the parsed value on success. On failure, prints formatted errors and exits with code `1`; if `process.exit` is unavailable, throws `AggregateError` with the raw `CastingError[]`.
- `formatEnvError(error)`: Pretty prints one `CastingError`.
- `formatEnvErrors(errors)`: Pretty prints the `CastingError[]` returned by `.parse(...)`.
