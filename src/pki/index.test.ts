import { describe, expect, it } from '@jest/globals';
import { ok } from 'resultage';
import { rsaPrivateKey, rsaPublicKey, x509Certificate } from './index';

const rsaPrivateKeyValue = [
  '-----BEGIN RSA PRIVATE KEY-----',
  'MIIBOgIBAAJBALu9fakekeycontent',
  '-----END RSA PRIVATE KEY-----',
].join('\n');

const rsaPublicKeyValue = [
  '-----BEGIN PUBLIC KEY-----',
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALu9fakekeycontent',
  '-----END PUBLIC KEY-----',
].join('\n');

const x509CertificateValue = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBhTCCASugAwIBAgIUfakecertificatecontent',
  '-----END CERTIFICATE-----',
].join('\n');

const realPkiEnvs = {
  PRIVATE_KEY: `-----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEAtGqjCNRHJFyOV0vomv2XfCC+xc8hQkofLUUcfil/7wSl2xjB
    B0fh8F12Mg4vkHyrzjHnnORJ4tKbTOH1/DjKwSZGWCapWkqOvmtwUAs1H42v93rc
    y7SY2XxGxDFr7UOHwYY6CZtNx222/sZGC5K/7/w2p1tU73nMHOQZaR9vGkjqb2Ms
    euCY8oo+qSolkNBQFWRxxciUljADcFQSSVizkEEeK/WuBE2TQrtyXa7VOvDcokf/
    XcgbCRft799JnVNRnm5edtEa0M1H73f4kJXnoyq5TWsLvr38KBHR4zvP1BF3zv6C
    C95xZX37btp4Uwc7OjxZ9HI6YzlpYb4BZ7ho2wIDAQABAoIBAGdrBR+nh0xJnfJe
    eex2VyJ5JsH+9IKqOGrbxfRv13zsfiI0c1m4E8ST3o/c39kEDfu5UZn2pn/V193f
    XQECkP7c8M/RAZzXRjHTJmNLuVzn/ClxjSVb1Y49ldcauVIdNrFxPs2I77HUq2Qp
    xbcWnN11BuMyEGLhv2YEPqiqsyYuFYmv3ySXNzVdkaF+Jo1uAmhOjyTAUAZI6GLF
    jXmtKOD8zzSCj06NCiBXTEUNf3Xqm4L74Mnu0jXT8QWBaFgXdw8o2K1XPOYgCfCh
    1zOZWUyh57SKBdIC1AiCc6k8IKj9s/gtboz3War4tBIKs3KtBePneyP8rBmeZsC5
    m+KrxiECgYEA1yLIwkwTI/ewRTmT6eUNHalbZByIdQsNGwLAaJ2Qq4yMqJYLOqEZ
    I+wTdoYaO78yx3DYI9+W68Hd/yk/ywKP+WuhkBPf1YBzvT4R05ahd3K7DbUTv87v
    f8hNaXU9flCkBwDykV2M0Dt8vFQroLmgrNh/TLPv63ehg+hJuT6CQMsCgYEA1q+W
    cyy/u+M06ez5mEogn++AMeKF7rFyqQA9HDiXeWnV+L+u9iLr3p3WZKIKZC81X9XE
    CBMa5LylUQYviJIcJmMWkT7fuocHmNlR3Zrvxx8uNv1CN4puBsKu3byIKaQX/LiH
    0plbsLLtCNCeKe3pJS4ffJ43Y6CmpbCfM8NnxjECgYEAlhzmWnS8sk8lBtiLNhwm
    D7lZVLx4Frs0VNGRsi2ngZwblZLEmQ9JvIAAgKZH7cKWywUZO8bKxwxKO73rjlrm
    XRJV9HN5rr7ng3eo9qvXVMKQdJsSAbeB8/au1VQCKX5ZRa3Kk9Xj6HRpr/tHSenc
    jF6wTLQNR478+059Cq3sMwsCgYAZrqew34mQUH3j/hVdwoBkoaIUVaTwCQpObVji
    J2L3g1G1kDi9+S9+UiNzpm7XzU31SP1Kef6dnnOoXbUSAWicrv3kIkFhbwXZoyXH
    /ODyUSiWK3Xgbw76gA+rNwKS+K5l7S1SZEYzvTPd+hbxrSRW7k2V+tdlc7J738Ur
    zBR+AQKBgQDGuCuKAGjMjoXapdASNiOb/tVItV7CUoMAwfIMczkXFF4GP+2NzqhU
    s6hz371rB7y/J65V8dhSIvZYsgHw2RrzXTi3GWejFFXeZrllikslttQTemlVtDcU
    g9h+8hRN521uZxxC8HT63WpLZ3y6bjOWsPOa1vdSOPdPiK2opsXeQQ==
    -----END RSA PRIVATE KEY-----`,
  PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtGqjCNRHJFyOV0vomv2X
    fCC+xc8hQkofLUUcfil/7wSl2xjBB0fh8F12Mg4vkHyrzjHnnORJ4tKbTOH1/DjK
    wSZGWCapWkqOvmtwUAs1H42v93rcy7SY2XxGxDFr7UOHwYY6CZtNx222/sZGC5K/
    7/w2p1tU73nMHOQZaR9vGkjqb2MseuCY8oo+qSolkNBQFWRxxciUljADcFQSSViz
    kEEeK/WuBE2TQrtyXa7VOvDcokf/XcgbCRft799JnVNRnm5edtEa0M1H73f4kJXn
    oyq5TWsLvr38KBHR4zvP1BF3zv6CC95xZX37btp4Uwc7OjxZ9HI6YzlpYb4BZ7ho
    2wIDAQAB
    -----END PUBLIC KEY-----`,
};

const toEnvPem = (value: string): string =>
  value
    .split('\n')
    .map((line) => line.trim())
    .join('\\n');

const fromEnvPem = (value: string): string => value.replace(/\\n/g, '\n');

describe('pki', () => {
  describe('PKI casters', () => {
    it.each([
      [
        rsaPrivateKey,
        rsaPrivateKeyValue.replace(/\n/g, '\\n'),
        rsaPrivateKeyValue,
      ],
      [rsaPublicKey, rsaPublicKeyValue, rsaPublicKeyValue],
      [
        x509Certificate,
        x509CertificateValue.replace(/\n/g, '\\n'),
        x509CertificateValue,
      ],
    ])('casts %s from PEM input', (caster, value, expected) => {
      expect(caster(value)).toEqual(ok(expected));
    });

    it('casts real PKI env values', () => {
      const privateKey = toEnvPem(realPkiEnvs.PRIVATE_KEY);
      const publicKey = toEnvPem(realPkiEnvs.PUBLIC_KEY);

      expect(rsaPrivateKey(privateKey)).toEqual(ok(fromEnvPem(privateKey)));
      expect(rsaPublicKey(publicKey)).toEqual(ok(fromEnvPem(publicKey)));
    });

    it.each([
      [
        rsaPrivateKey,
        rsaPublicKeyValue,
        'pki::rsaPrivateKey',
        rsaPublicKeyValue,
      ],
      [
        rsaPublicKey,
        rsaPrivateKeyValue,
        'pki::rsaPublicKey',
        rsaPrivateKeyValue,
      ],
      [
        x509Certificate,
        rsaPrivateKeyValue,
        'pki::x509Certificate',
        rsaPrivateKeyValue,
      ],
    ])(
      'returns err(ERR_INVALID_VALUE) for invalid %s value',
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
});
