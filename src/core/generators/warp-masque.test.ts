import { afterEach, describe, expect, it, mock } from 'bun:test';
import { BUILT_IN_RELAY } from './warp-relay';
import {
    WARP_MASQUE_SNI, buildWarpMasqueOutbound, endpointAddress, generateWarpMasqueAccount,
    masqueWarpAddress, withWarpMasqueAccount, type WarpMasqueAccount,
} from './warp-masque';
import { fromPem, generateMasqueKeyPair, toPem } from './masque-keys';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const PEM = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\n-----END PUBLIC KEY-----';

/** The answers the relay gave in a live run on 2026-10-14, keys and ids replaced. */
const REGISTERED = {
    id: 'dev-1234-abcd', token: 'tok', warp_enabled: true,
    config: {
        client_id: 'AQID',
        peers: [{ public_key: 'bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=', endpoint: { v4: '162.159.192.10:0', v6: '[2606:4700:d0::a29f:c00a]:0', host: 'engage.cloudflareclient.com:2408' } }],
        interface: { addresses: { v4: '172.16.0.2', v6: '2606:4700:110:8a36::2' } },
    },
};
const ENROLLED = {
    ...REGISTERED, key_type: 'secp256r1', tunnel_type: 'masque',
    config: {
        ...REGISTERED.config,
        peers: [{ public_key: PEM, endpoint: { v4: '162.159.198.2:0', v6: '[2606:4700:103::2]:0', host: 'engage.cloudflareclient.com:2408', ports: [443, 500] } }],
    },
};

const scripted = (...answers: unknown[]) => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify(answers.shift() ?? {}), { status: 200 });
    }) as unknown as typeof fetch;
    return calls;
};

const ACCOUNT: WarpMasqueAccount = {
    id: 'dev-1234-abcd', token: 'tok', privateKey: 'PRIV', publicKey: 'PUB', peerPublicKey: PEM,
    endpointV4: '162.159.198.2', endpointV6: '2606:4700:103::2', ipv4: '172.16.0.2', ipv6: '2606:4700:110:8a36::2',
};

describe('the MASQUE key', () => {
    it('is a P-256 pair WebCrypto can read back, in the encodings Xray and Cloudflare take', async () => {
        const keys = await generateMasqueKeyPair();
        const der = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        // SPKI of a P-256 key is 91 bytes (usque RESEARCH.md:34-39).
        expect(der(keys.publicKey).length).toBe(91);
        await crypto.subtle.importKey('pkcs8', der(keys.privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
        await crypto.subtle.importKey('spki', der(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    });

    it('goes in and out of PEM', () => {
        const body = 'A'.repeat(100);
        expect(fromPem(toPem('PUBLIC KEY', body))).toBe(body);
        expect(fromPem('  plain  ')).toBe('plain');
    });
});

describe('registering for MASQUE', () => {
    it('registers, then enrols only the public half of a key made here', async () => {
        const calls = scripted(REGISTERED, ENROLLED);
        const account = await generateWarpMasqueAccount(BUILT_IN_RELAY);
        expect(calls.map(c => [c.init.method, new URL(c.url).pathname])).toEqual([
            ['POST', '/v2/reg'],
            ['PATCH', '/v2/reg/dev-1234-abcd'],
        ]);
        const enrolment = JSON.parse(String(calls[1]!.init.body));
        expect(enrolment).toEqual({ key: account.publicKey, key_type: 'secp256r1', tunnel_type: 'masque' });
        expect(JSON.stringify(calls)).not.toContain(account.privateKey);
        expect(account).toMatchObject({
            peerPublicKey: PEM, endpointV4: '162.159.198.2', endpointV6: '2606:4700:103::2',
            ipv4: '172.16.0.2', ipv6: '2606:4700:110:8a36::2', id: 'dev-1234-abcd', token: 'tok',
        });
    });

    it('refuses an answer without Cloudflare\'s MASQUE key', async () => {
        scripted(REGISTERED, REGISTERED);
        await expect(generateWarpMasqueAccount(BUILT_IN_RELAY)).rejects.toMatchObject({ code: 'bad_response' });
    });
});

describe('the outbound', () => {
    it('is what Xray 26.10 needs to reach Cloudflare', () => {
        expect(buildWarpMasqueOutbound(ACCOUNT, 'warp-masque')).toEqual({
            tag: 'warp-masque',
            protocol: 'masque',
            settings: { address: '162.159.198.2', port: 443 },
            streamSettings: {
                network: 'masque',
                security: 'tls',
                tlsSettings: { serverName: WARP_MASQUE_SNI },
                masqueSettings: {
                    warp: { privateKey: 'PRIV', publicKey: PEM, address: ['172.16.0.2/32', '2606:4700:110:8a36::2/128'] },
                },
            },
        });
    });

    it('re-registers an existing one without losing what else it holds, and drops the login warp refuses', () => {
        const existing = {
            tag: 'mine', protocol: 'masque', settings: { address: 'old', port: 8443, remoteDNS: ['9.9.9.9'] },
            streamSettings: {
                network: 'masque', security: 'tls', tlsSettings: { serverName: 'custom.sni', alpn: ['h2'] },
                sockopt: { mark: 1 }, masqueSettings: { user: 'u', pass: 'p', headers: { 'X-A': 'b' } },
            },
        };
        const next = withWarpMasqueAccount(existing, ACCOUNT);
        expect(next.settings).toEqual({ address: '162.159.198.2', port: 443, remoteDNS: ['9.9.9.9'] });
        expect(next.streamSettings.tlsSettings).toEqual({ serverName: 'custom.sni', alpn: ['h2'] });
        expect(next.streamSettings.sockopt).toEqual({ mark: 1 });
        // v26.10.10:infra/conf/transport_method.go:818 — user/pass with warp is refused.
        expect(next.streamSettings.masqueSettings).toEqual({ headers: { 'X-A': 'b' }, warp: expect.any(Object) });
    });

    it('reads the endpoint forms the API sends', () => {
        expect(endpointAddress('162.159.198.2:0')).toBe('162.159.198.2');
        expect(endpointAddress('[2606:4700:103::2]:0')).toBe('2606:4700:103::2');
        expect(endpointAddress('')).toBe('');
        expect(masqueWarpAddress({ ipv4: '', ipv6: '2606::1' })).toEqual(['2606::1/128']);
    });
});
