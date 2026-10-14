import { afterEach, describe, expect, it, mock } from 'bun:test';
import { BUILT_IN_RELAY, RelayError, describeRelayError, pingRelay, relayCall, warpRelay } from './warp-relay';
import { generateWarpAccount, readWarpDevice, reservedFromClientId, withRateLimitRetry } from './warp';
import { wireguardPublicKey } from './crypto';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

type Answer = { status?: number; body: unknown };
/** A fetch that answers each call in turn and records what it was asked. */
const scripted = (...answers: Answer[]) => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        const answer = answers.shift() ?? { status: 500, body: { error: 'unexpected call' } };
        const text = typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body);
        return new Response(text, { status: answer.status ?? 200 });
    }) as unknown as typeof fetch;
    return calls;
};

const DEVICE = {
    id: 'd1-abcdef',
    token: 'tok',
    warp_enabled: true,
    account: { account_type: 'free' },
    config: {
        client_id: btoa(String.fromCharCode(1, 2, 3)),
        peers: [{ public_key: 'bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=', endpoint: { host: 'engage.cloudflareclient.com:2408', v4: '162.159.192.1:0', v6: '[2606:4700:d0::a29f:c001]:0' } }],
        interface: { addresses: { v4: '172.16.0.2', v6: '2606:4700:110:8a36::2' } },
    },
};

describe('which relay', () => {
    it('is the built-in one until a URL is entered', () => {
        expect(warpRelay('', 'ignored')).toBe(BUILT_IN_RELAY);
        expect(warpRelay('  https://me.workers.dev/ ', ' k ')).toEqual({ url: 'https://me.workers.dev', key: 'k', builtIn: false });
    });
});

describe('talking to the relay', () => {
    it('sends the access key and the device token in their own headers', async () => {
        const calls = scripted({ body: { ok: true } });
        await relayCall(BUILT_IN_RELAY, 'PATCH', '/v2/reg/x', { token: 'dev', body: { warp_enabled: true } });
        const headers = calls[0]!.init.headers as Record<string, string>;
        expect(headers['X-Xcui-Key']).toBe(BUILT_IN_RELAY.key);
        expect(headers['X-Warp-Token']).toBe('dev');
    });

    it('names each failure', async () => {
        const cases: [Answer, string][] = [
            [{ status: 401, body: { error: 'no_key' } }, 'no_key'],
            [{ status: 403, body: { error: 'origin' } }, 'origin'],
            [{ status: 429, body: { error: 'rate_limited' } }, 'rate_limited'],
            [{ status: 405, body: 'Method not allowed. Use GET' }, 'not_relay'],
            [{ status: 502, body: { error: 'bad_upstream' } }, 'upstream'],
            [{ status: 200, body: '<html>' }, 'bad_response'],
        ];
        for (const [answer, code] of cases) {
            scripted(answer);
            const error = await relayCall(BUILT_IN_RELAY, 'GET', '/v2/ping').catch(e => e);
            expect(error).toBeInstanceOf(RelayError);
            expect(error.code).toBe(code);
            expect(describeRelayError(error)).not.toBe('');
        }
    });

    it('checks a relay with a ping', async () => {
        scripted({ body: { ok: true, version: 2 } });
        expect(await pingRelay(BUILT_IN_RELAY)).toEqual({ version: 2 });
        scripted({ body: { something: 'else' } });
        await expect(pingRelay(BUILT_IN_RELAY)).rejects.toThrow();
    });
});

describe('reading a device', () => {
    it('takes the fields WireGuard needs, from either wrapping', () => {
        const device = readWarpDevice(DEVICE);
        expect(device).toMatchObject({
            id: 'd1-abcdef', token: 'tok', reserved: [1, 2, 3],
            peerPublicKey: DEVICE.config.peers[0]!.public_key,
            endpointHost: 'engage.cloudflareclient.com:2408',
            ipv4: '172.16.0.2', ipv6: '2606:4700:110:8a36::2', warpEnabled: true, accountType: 'free',
        });
        expect(readWarpDevice({ result: DEVICE })).toEqual(device);
    });

    it('turns client_id into the three reserved bytes, and anything else into zeros', () => {
        expect(reservedFromClientId(btoa(String.fromCharCode(255, 0, 7)))).toEqual([255, 0, 7]);
        expect(reservedFromClientId('')).toEqual([0, 0, 0]);
        expect(reservedFromClientId('not base64!')).toEqual([0, 0, 0]);
        expect(reservedFromClientId(btoa('four'))).toEqual([0, 0, 0]);
    });
});

describe('registering for WireGuard', () => {
    it('makes the key pair here and sends the relay only the public half', async () => {
        const calls = scripted({ body: DEVICE });
        const account = await generateWarpAccount(BUILT_IN_RELAY);
        const sent = JSON.parse(String(calls[0]!.init.body));
        expect(Object.keys(sent)).toEqual(['key']);
        expect(sent.key).toBe(account.publicKey);
        expect(wireguardPublicKey(account.privateKey)).toBe(account.publicKey);
        expect(JSON.stringify(calls)).not.toContain(account.privateKey);
        expect(account.reserved).toEqual([1, 2, 3]);
        expect(account.endpoint).toBe('engage.cloudflareclient.com:2408');
    });

    it('switches WARP on when the registration left it off', async () => {
        const off = { ...DEVICE, warp_enabled: false };
        const calls = scripted({ body: off }, { body: { ...DEVICE, id: undefined, token: undefined } });
        const account = await generateWarpAccount(BUILT_IN_RELAY);
        expect(calls.map(c => c.init.method)).toEqual(['POST', 'PATCH']);
        expect(JSON.parse(String(calls[1]!.init.body))).toEqual({ warp_enabled: true });
        expect(account.id).toBe('d1-abcdef');
        expect(account.token).toBe('tok');
    });

    it('falls back to the old bare GET for a worker of the user\'s own that is not a v2 relay', async () => {
        const calls = scripted(
            { status: 405, body: 'Method not allowed. Use GET' },
            { body: { privKey: 'p', peer_pub: 'q', client_ipv4: '172.16.0.2', client_ipv6: '' } },
        );
        const account = await generateWarpAccount(warpRelay('https://old.workers.dev', ''));
        expect(calls.map(c => c.init.method)).toEqual(['POST', 'GET']);
        expect(account.privateKey).toBe('p');
    });

    it('never falls back on the built-in relay', async () => {
        scripted({ status: 405, body: 'nope' });
        await expect(generateWarpAccount(BUILT_IN_RELAY)).rejects.toMatchObject({ code: 'not_relay' });
    });
});

describe('rate limits', () => {
    it('retries a rate-limited call and gives up after the last try', async () => {
        let n = 0;
        const flaky = async () => {
            n++;
            if (n < 3) throw new RelayError('rate_limited', 'slow down', 429);
            return 'done';
        };
        expect(await withRateLimitRetry(flaky, 3, async () => {})).toBe('done');
        n = -10;
        await expect(withRateLimitRetry(flaky, 2, async () => {})).rejects.toMatchObject({ code: 'rate_limited' });
    });

    it('does not retry anything else', async () => {
        let n = 0;
        const broken = async () => { n++; throw new RelayError('no_key', 'no', 401); };
        await withRateLimitRetry(broken, 3, async () => {}).catch(() => {});
        expect(n).toBe(1);
    });
});
