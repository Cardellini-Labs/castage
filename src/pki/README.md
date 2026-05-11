# castage/pki

Use `castage/pki` for PEM-encoded key and certificate values. These casters normalize escaped `\n` sequences, which makes them convenient for values loaded from environment-like sources without making them part of the env entrypoint.

```ts
import { rsaPrivateKey, rsaPublicKey, x509Certificate } from 'castage/pki';

rsaPrivateKey('-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----');
rsaPublicKey('-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----');
x509Certificate('-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----');
```

## Casters

- `rsaPrivateKey`: Ensures an RSA private PEM key and normalizes escaped `\n` sequences.
- `rsaPublicKey`: Ensures an RSA public PEM key and normalizes escaped `\n` sequences.
- `x509Certificate`: Ensures an X.509 PEM certificate and normalizes escaped `\n` sequences.
