/**
 * xcui-warp: the small relay the editor registers Cloudflare WARP devices
 * through.
 *
 * A browser cannot call api.cloudflareclient.com itself — the API sends no
 * CORS headers and expects a client User-Agent a page is not allowed to set —
 * so something has to stand in between. This Worker is that something, and
 * deliberately nothing more:
 *
 *  - It never sees a private key. The editor generates the WireGuard (X25519)
 *    or MASQUE (ECDSA P-256) key pair itself and sends only the public half.
 *    The previous version generated the pair here and returned the private
 *    key in the response body.
 *  - It forwards a fixed set of calls — register, read a device, update a
 *    device — with the headers the official client sends, and validates every
 *    field it forwards. It is not a general proxy.
 *  - It answers only callers that present an access key, and only browsers on
 *    the origins listed below. Neither is a secret in any strong sense: the
 *    built-in key ships inside a public web app. What they do is keep the
 *    Worker from being an open relay that any scanner can find and use. A
 *    self-hosted copy should set its own key (see README.md).
 */

export interface Env {
    /** Extra access keys, comma-separated. Set with `wrangler secret put ACCESS_KEYS`. */
    ACCESS_KEYS?: string;
    /** Which client to present as, by name from PROFILES. Defaults to the first. */
    API_PROFILE?: string;
    /** Extra allowed browser origins, comma-separated (e.g. a self-hosted editor). */
    ALLOWED_ORIGINS?: string;
    /** Per-IP limiter for registrations. Absent in tests. */
    REGISTER_LIMITER?: RateLimit;
}

interface RateLimit {
    limit(options: { key: string }): Promise<{ success: boolean }>;
}

// ── Access ─────────────────────────────────────────────────────────────────

/**
 * The key the public editor sends. Shipped in its bundle on purpose: it stops
 * drive-by use, not a determined reader. Change it here and in the editor
 * (src/core/generators/warp-relay.ts) together, or add keys of your own
 * through the ACCESS_KEYS secret without touching the code.
 */
export const BUILT_IN_KEYS = ['xcui_Adg116mQs0antVZvlRcyH6jjNSK5UO8E'];

/** Origins a browser may call from. Requests without an Origin (curl, scripts) are judged by key alone. */
const BUILT_IN_ORIGINS = ['https://bropines.github.io'];

/** Any port on the loopback names: the editor's dev server and previews. */
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const list = (value: string | undefined): string[] =>
    (value ?? '').split(',').map(item => item.trim()).filter(Boolean);

const originAllowed = (origin: string, env: Env): boolean =>
    LOCAL_ORIGIN.test(origin) || [...BUILT_IN_ORIGINS, ...list(env.ALLOWED_ORIGINS)].includes(origin);

const digest = (text: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

/**
 * Equal digests, without an early exit. Workers have
 * `crypto.subtle.timingSafeEqual`; the fold is for runtimes that do not (the
 * tests run under Bun). Both inputs are SHA-256, so the lengths always match.
 */
const sameDigest = (a: ArrayBuffer, b: ArrayBuffer): boolean => {
    const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean };
    if (typeof subtle.timingSafeEqual === 'function') return subtle.timingSafeEqual(a, b);
    const x = new Uint8Array(a);
    const y = new Uint8Array(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < x.length; i++) diff |= x[i]! ^ (y[i] ?? 0);
    return diff === 0;
};

/** Constant-time match against every configured key: hash first so length does not leak. */
const keyAccepted = async (provided: string, env: Env): Promise<boolean> => {
    const given = await digest(provided);
    let match = false;
    for (const key of [...BUILT_IN_KEYS, ...list(env.ACCESS_KEYS)]) {
        if (sameDigest(given, await digest(key))) match = true;
    }
    return match;
};

// ── Upstream ───────────────────────────────────────────────────────────────

/**
 * Who the relay says it is to the API: an API version and the two headers
 * that go with it, copied as a set from a client that uses them — Cloudflare
 * has been seen to refuse mismatched sets.
 *
 *  - `android` is what Throne (core/internal/warp/api.go:21-30, 2026-10) and
 *    usque (internal/consts.go:3-24) send. It registers WireGuard and enrols
 *    MASQUE keys.
 *  - `legacy` is what this relay used before 1.29, and what kept working from
 *    Workers until then. Its answers come wrapped in `result`.
 *
 * Switch with the API_PROFILE variable if Cloudflare starts refusing one.
 * No Accept header: the Android client sends none, and wgcf removes it.
 */
export const PROFILES = {
    android: { base: 'https://api.cloudflareclient.com/v0a4471', userAgent: 'WARP for Android', clientVersion: 'a-6.35-4471' },
    legacy: { base: 'https://api.cloudflareclient.com/v0i1909051800', userAgent: 'okhttp/3.12.1', clientVersion: '' },
} as const;

export type ProfileName = keyof typeof PROFILES;
type Profile = (typeof PROFILES)[ProfileName];

const profileOf = (env: Env): Profile =>
    env.API_PROFILE && env.API_PROFILE in PROFILES ? PROFILES[env.API_PROFILE as ProfileName] : PROFILES.android;

export const clientHeaders = (profile: Profile): Record<string, string> => ({
    'User-Agent': profile.userAgent,
    ...(profile.clientVersion ? { 'CF-Client-Version': profile.clientVersion } : {}),
    'Content-Type': 'application/json; charset=UTF-8',
});

const MAX_BODY = 4096;

/** A device id as the API hands them out: letters, digits and dashes. */
const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Standard base64 of exactly `bytes` bytes. */
const isBase64Of = (value: unknown, bytes: number): value is string => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
    try {
        return atob(value).length === bytes;
    } catch {
        return false;
    }
};

/** Standard base64 of a DER public key: P-256 SubjectPublicKeyInfo is 91 bytes. */
const isBase64Der = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length > 512 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
    try {
        const der = atob(value);
        return der.length >= 64 && der.charCodeAt(0) === 0x30;
    } catch {
        return false;
    }
};

class HttpError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
        super(message);
    }
}

const readJson = async (request: Request): Promise<Record<string, unknown>> => {
    const declared = Number(request.headers.get('Content-Length') ?? '0');
    if (declared > MAX_BODY) throw new HttpError(413, 'too_large', 'Request body too large.');
    const text = await request.text();
    if (text.length > MAX_BODY) throw new HttpError(413, 'too_large', 'Request body too large.');
    try {
        const parsed: unknown = JSON.parse(text || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        return parsed as Record<string, unknown>;
    } catch {
        throw new HttpError(400, 'bad_json', 'Request body must be a JSON object.');
    }
};

const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * The registration body, built here around the one field the caller may
 * choose. The fields and their values are the Android client's, as Throne
 * (core/internal/warp/register.go:55-68) and usque (api/cloudflare.go:58-69)
 * send them; the serial number is eight random bytes, as usque makes it.
 * A MASQUE device is registered the same way and its ECDSA key enrolled
 * afterwards with a PATCH.
 */
export const registrationBody = (key: string, now = new Date()) => ({
    key,
    install_id: '',
    fcm_token: '',
    tos: now.toISOString(),
    model: 'PC',
    serial_number: hex(crypto.getRandomValues(new Uint8Array(8))),
    key_type: 'curve25519',
    tunnel_type: 'wireguard',
    locale: 'en_US',
});

/** What a caller may change on a device, and the values each may take. */
export const devicePatch = (body: Record<string, unknown>): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};
    if ('warp_enabled' in body) {
        if (typeof body.warp_enabled !== 'boolean') throw new HttpError(400, 'bad_field', '"warp_enabled" must be true or false.');
        patch.warp_enabled = body.warp_enabled;
    }
    if ('key' in body || 'key_type' in body || 'tunnel_type' in body) {
        const keyType = body.key_type;
        if (keyType === 'secp256r1') {
            if (!isBase64Der(body.key)) throw new HttpError(400, 'bad_key', '"key" must be the base64 DER of an ECDSA P-256 public key.');
            if (body.tunnel_type !== 'masque') throw new HttpError(400, 'bad_field', 'An ECDSA key is enrolled with "tunnel_type": "masque".');
        } else if (keyType === 'curve25519' || keyType === undefined) {
            if (!isBase64Of(body.key, 32)) throw new HttpError(400, 'bad_key', '"key" must be a base64 WireGuard public key.');
            if (body.tunnel_type !== undefined && body.tunnel_type !== 'wireguard') {
                throw new HttpError(400, 'bad_field', 'A WireGuard key is enrolled with "tunnel_type": "wireguard".');
            }
        } else {
            throw new HttpError(400, 'bad_field', '"key_type" must be "curve25519" or "secp256r1".');
        }
        patch.key = body.key;
        if (keyType !== undefined) patch.key_type = keyType;
        if (body.tunnel_type !== undefined) patch.tunnel_type = body.tunnel_type;
    }
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'empty_patch', 'Nothing to change.');
    return patch;
};

/**
 * Forward one call and hand back the API's JSON as it came, with its status.
 * Cloudflare answers a flood with a 429 (once an HTML page, error 1015) and a
 * client it does not believe with 403 error 1020; each becomes a JSON error
 * the editor can tell apart from a real failure.
 */
const upstream = async (env: Env, method: string, path: string, body?: unknown, token?: string): Promise<Response> => {
    const profile = profileOf(env);
    const headers = clientHeaders(profile);
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${profile.base}/${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (response.status === 429 || /error code:?\s*1015/i.test(text)) {
        throw new HttpError(429, 'rate_limited', 'Cloudflare is rate limiting registrations. Try again in a minute.');
    }
    if (response.status === 403 && /1020/.test(text)) {
        throw new HttpError(502, 'refused_client', 'Cloudflare refused the relay as a client (error 1020).');
    }
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        throw new HttpError(502, 'bad_upstream', `Cloudflare answered ${response.status} with something that is not JSON.`);
    }
    return Response.json(json, { status: response.ok ? 200 : response.status });
};

// ── Routing ────────────────────────────────────────────────────────────────

const corsHeaders = (origin: string | null): Record<string, string> => origin ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Xcui-Key, X-Warp-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
} : {};

const withHeaders = (response: Response, headers: Record<string, string>): Response => {
    const out = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers)) out.headers.set(name, value);
    out.headers.set('Cache-Control', 'no-store');
    return out;
};

const fail = (status: number, code: string, message: string) => Response.json({ error: code, message }, { status });

const route = async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    const provided = request.headers.get('X-Xcui-Key') ?? '';
    if (!provided || !(await keyAccepted(provided, env))) {
        return fail(401, 'no_key', 'This relay needs an access key (X-Xcui-Key).');
    }

    if (path === '/v2/ping' && request.method === 'GET') {
        return Response.json({ ok: true, service: 'xcui-warp', version: 2 });
    }

    if (path === '/v2/reg' && request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        if (env.REGISTER_LIMITER && !(await env.REGISTER_LIMITER.limit({ key: ip })).success) {
            return fail(429, 'rate_limited', 'Too many registrations from this address. Try again in a minute.');
        }
        const body = await readJson(request);
        if (!isBase64Of(body.key, 32)) {
            return fail(400, 'bad_key', '"key" must be a base64 WireGuard public key (32 bytes).');
        }
        return upstream(env, 'POST', 'reg', registrationBody(body.key));
    }

    const device = /^\/v2\/reg\/([^/]+)$/.exec(path);
    if (device) {
        const id = device[1]!;
        if (!DEVICE_ID.test(id)) return fail(400, 'bad_id', 'That is not a device id.');
        const token = request.headers.get('X-Warp-Token') ?? '';
        if (!token || token.length > 512) return fail(401, 'no_token', 'Send the device token in X-Warp-Token.');
        if (request.method === 'GET') return upstream(env, 'GET', `reg/${id}`, undefined, token);
        if (request.method === 'PATCH') return upstream(env, 'PATCH', `reg/${id}`, devicePatch(await readJson(request)), token);
    }

    return fail(404, 'not_found', 'Unknown route.');
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const origin = request.headers.get('Origin');
        if (origin !== null && !originAllowed(origin, env)) {
            return fail(403, 'origin', 'This relay does not serve that site.');
        }
        const cors = corsHeaders(origin);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

        try {
            return withHeaders(await route(request, env), cors);
        } catch (error) {
            if (error instanceof HttpError) return withHeaders(fail(error.status, error.code, error.message), cors);
            console.error(JSON.stringify({ message: 'unhandled', error: error instanceof Error ? error.message : String(error) }));
            return withHeaders(fail(500, 'internal', 'The relay failed.'), cors);
        }
    },
};
