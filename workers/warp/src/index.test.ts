import { afterEach, describe, expect, it, mock } from 'bun:test';
import worker, { BUILT_IN_KEYS, PROFILES, clientHeaders, devicePatch, registrationBody } from './index';

const UPSTREAM = PROFILES.android.base;

const KEY = BUILT_IN_KEYS[0]!;
const WG_PUB = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const ORIGIN = 'https://bropines.github.io';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

/** Replace fetch with one that records the call and answers `body`. */
const upstreamAnswers = (body: string, status = 200) => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;
    return calls;
};

/**
 * A request as the Worker sees it. Not `new Request()`: under the editor's
 * test setup that is happy-dom's, which drops `Origin` as a browser would —
 * and Origin is half of what is being tested. A standalone Headers keeps it.
 */
const call = (path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}, env = {}) => {
    const body = init.body ?? '';
    const request = {
        method: init.method ?? 'GET',
        url: `https://xcui.example.workers.dev${path}`,
        headers: new Headers(init.headers ?? {}),
        text: async () => body,
    };
    return worker.fetch(request as unknown as Request, env);
};

const authed = (extra: Record<string, string> = {}) => ({ 'X-Xcui-Key': KEY, Origin: ORIGIN, ...extra });

describe('access', () => {
    it('turns away a caller without the key, before anything reaches Cloudflare', async () => {
        const calls = upstreamAnswers('{}');
        const response = await call('/v2/reg', { method: 'POST', headers: { Origin: ORIGIN }, body: JSON.stringify({ key: WG_PUB }) });
        expect(response.status).toBe(401);
        expect(calls).toHaveLength(0);
    });

    it('turns away a wrong key', async () => {
        const response = await call('/v2/ping', { headers: { 'X-Xcui-Key': `${KEY}x` } });
        expect(response.status).toBe(401);
    });

    it('takes a key added through the ACCESS_KEYS secret', async () => {
        const response = await call('/v2/ping', { headers: { 'X-Xcui-Key': 'mine' } }, { ACCESS_KEYS: 'other, mine' });
        expect(response.status).toBe(200);
    });

    it('serves no browser on a site it does not know, even with the key', async () => {
        const response = await call('/v2/ping', { headers: { 'X-Xcui-Key': KEY, Origin: 'https://evil.example' } });
        expect(response.status).toBe(403);
    });

    it('serves the editor, a dev server, and a site added through ALLOWED_ORIGINS', async () => {
        for (const origin of [ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:61791']) {
            const response = await call('/v2/ping', { headers: { 'X-Xcui-Key': KEY, Origin: origin } });
            expect(response.status).toBe(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        }
        const own = await call('/v2/ping', { headers: { 'X-Xcui-Key': KEY, Origin: 'https://me.example' } }, { ALLOWED_ORIGINS: 'https://me.example' });
        expect(own.status).toBe(200);
    });

    it('answers a preflight without the key, naming the headers the editor sends', async () => {
        const response = await call('/v2/reg', { method: 'OPTIONS', headers: { Origin: ORIGIN } });
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Xcui-Key');
    });

    it('no longer hands out a key pair to a bare GET, as the old relay did', async () => {
        const calls = upstreamAnswers('{}');
        const response = await call('/', { headers: authed() });
        expect(response.status).toBe(404);
        expect(calls).toHaveLength(0);
    });
});

describe('registration', () => {
    it('forwards the public key with the client headers and passes the answer back', async () => {
        const calls = upstreamAnswers(JSON.stringify({ id: 'abc-123-def', token: 't', config: {} }));
        const response = await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB }) });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ id: 'abc-123-def', token: 't', config: {} });
        expect(calls[0]!.url).toBe(`${UPSTREAM}/reg`);
        expect(calls[0]!.init.method).toBe('POST');
        expect(calls[0]!.init.headers).toEqual(clientHeaders(PROFILES.android));
        expect(calls[0]!.init.headers).toMatchObject({ 'User-Agent': 'WARP for Android', 'CF-Client-Version': 'a-6.35-4471' });
        expect(JSON.parse(String(calls[0]!.init.body)).key).toBe(WG_PUB);
    });

    it('presents as the older client when API_PROFILE says so', async () => {
        const calls = upstreamAnswers(JSON.stringify({ result: {} }));
        await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB }) }, { API_PROFILE: 'legacy' });
        expect(calls[0]!.url).toBe(`${PROFILES.legacy.base}/reg`);
        expect(calls[0]!.init.headers).not.toHaveProperty('CF-Client-Version');
    });

    it('tells a refused client apart from a rate limit', async () => {
        upstreamAnswers('error code: 1020', 403);
        const response = await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB }) });
        expect((await response.json() as { error: string }).error).toBe('refused_client');
    });

    it('builds the body itself: the caller chooses the key and nothing else', () => {
        const body = registrationBody(WG_PUB, new Date('2026-10-14T00:00:00Z'));
        expect(body.key).toBe(WG_PUB);
        expect(body.tos).toBe('2026-10-14T00:00:00.000Z');
        expect(body).toMatchObject({ model: 'PC', key_type: 'curve25519', tunnel_type: 'wireguard', locale: 'en_US' });
        expect(body.serial_number).toMatch(/^[0-9a-f]{16}$/);
    });

    it('refuses anything that is not a 32-byte base64 key', async () => {
        const calls = upstreamAnswers('{}');
        for (const key of ['', 'short', btoa('x'.repeat(31)), 42, null]) {
            const response = await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key }) });
            expect(response.status).toBe(400);
        }
        expect(calls).toHaveLength(0);
    });

    it('refuses a body that is not JSON, or too large', async () => {
        upstreamAnswers('{}');
        expect((await call('/v2/reg', { method: 'POST', headers: authed(), body: 'nope' })).status).toBe(400);
        expect((await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB, pad: 'x'.repeat(5000) }) })).status).toBe(413);
    });

    it('says rate limited, as JSON, when Cloudflare answers with its 1015 page', async () => {
        upstreamAnswers('<html>error code: 1015</html>', 429);
        const response = await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB }) });
        expect(response.status).toBe(429);
        expect((await response.json() as { error: string }).error).toBe('rate_limited');
    });

    it('stops a caller its own limiter has had enough of', async () => {
        const calls = upstreamAnswers('{}');
        const env = { REGISTER_LIMITER: { limit: async () => ({ success: false }) } };
        const response = await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB }) }, env);
        expect(response.status).toBe(429);
        expect(calls).toHaveLength(0);
    });

    it('is never cached', async () => {
        upstreamAnswers('{}');
        const response = await call('/v2/reg', { method: 'POST', headers: authed(), body: JSON.stringify({ key: WG_PUB }) });
        expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
});

describe('device calls', () => {
    it('reads and updates a device with its own token, as a bearer upstream', async () => {
        const calls = upstreamAnswers('{"ok":true}');
        await call('/v2/reg/abc-123-def', { headers: authed({ 'X-Warp-Token': 'device-token' }) });
        await call('/v2/reg/abc-123-def', { method: 'PATCH', headers: authed({ 'X-Warp-Token': 'device-token' }), body: JSON.stringify({ warp_enabled: true }) });
        expect(calls.map(c => [c.init.method, c.url])).toEqual([
            ['GET', `${UPSTREAM}/reg/abc-123-def`],
            ['PATCH', `${UPSTREAM}/reg/abc-123-def`],
        ]);
        expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer device-token');
    });

    it('needs the device token', async () => {
        const response = await call('/v2/reg/abc-123-def', { headers: authed() });
        expect(response.status).toBe(401);
    });

    it('refuses a path that is not a device id', async () => {
        const response = await call('/v2/reg/..%2Fother', { headers: authed({ 'X-Warp-Token': 't' }) });
        expect(response.status).toBe(400);
    });
});

describe('what a device update may carry', () => {
    const p256 = btoa(String.fromCharCode(0x30, ...new Uint8Array(90)));

    it('takes WARP on or off', () => {
        expect(devicePatch({ warp_enabled: true })).toEqual({ warp_enabled: true });
    });

    it('takes a MASQUE key enrolment and nothing beside it', () => {
        expect(devicePatch({ key: p256, key_type: 'secp256r1', tunnel_type: 'masque', name: 'x', extra: 1 }))
            .toEqual({ key: p256, key_type: 'secp256r1', tunnel_type: 'masque' });
    });

    it('takes a WireGuard key change', () => {
        expect(devicePatch({ key: WG_PUB })).toEqual({ key: WG_PUB });
    });

    it('refuses mismatched or malformed keys and empty updates', () => {
        expect(() => devicePatch({ key: WG_PUB, key_type: 'secp256r1', tunnel_type: 'masque' })).toThrow();
        expect(() => devicePatch({ key: p256, key_type: 'secp256r1' })).toThrow();
        expect(() => devicePatch({ key: p256, key_type: 'rsa' })).toThrow();
        expect(() => devicePatch({ warp_enabled: 'yes' })).toThrow();
        expect(() => devicePatch({})).toThrow();
    });
});
