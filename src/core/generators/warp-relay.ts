/**
 * The WARP relay: the Cloudflare Worker the editor registers WARP devices
 * through (its source is workers/warp in this repository).
 *
 * A browser cannot talk to api.cloudflareclient.com itself, so a relay stands
 * in. Since 1.29 it is a narrow one: the editor makes the key pair, sends only
 * the public half, and reads the device back; the relay forwards that and
 * nothing else, and answers only callers holding an access key.
 *
 * The built-in key below ships in this public bundle. It is not a secret and
 * is not meant to be — it keeps the relay from being an open endpoint that
 * any scanner can use. Anyone who wants their own runs their own copy of the
 * Worker and enters its URL and key in Settings.
 */
import { t } from '../../i18n';

export interface WarpRelay {
    /** Base URL, no trailing slash. */
    url: string;
    /** Sent as X-Xcui-Key. */
    key: string;
    /** The relay this editor ships with, rather than one the user entered. */
    builtIn: boolean;
}

/** Keep in step with BUILT_IN_KEYS in workers/warp/src/index.ts. */
export const BUILT_IN_RELAY: WarpRelay = {
    url: 'https://xcui.bropines.workers.dev',
    key: 'xcui_Adg116mQs0antVZvlRcyH6jjNSK5UO8E',
    builtIn: true,
};

/** The relay the settings describe: the user's own when a URL is entered, the built-in one otherwise. */
export const warpRelay = (url?: string, key?: string): WarpRelay => {
    const trimmed = (url ?? '').trim().replace(/\/+$/, '');
    return trimmed ? { url: trimmed, key: (key ?? '').trim(), builtIn: false } : BUILT_IN_RELAY;
};

export type RelayErrorCode =
    | 'no_key' | 'origin' | 'rate_limited' | 'not_relay' | 'network' | 'bad_response' | 'upstream';

export class RelayError extends Error {
    constructor(readonly code: RelayErrorCode, message: string, readonly status = 0) {
        super(message);
        this.name = 'RelayError';
    }
}

/** A failure in words for the person who pressed the button: what happened and what to do about it. */
export const describeRelayError = (error: unknown): string => {
    if (!(error instanceof RelayError)) return error instanceof Error && error.message ? error.message : t("Network error or proxy timeout.");
    switch (error.code) {
        case 'no_key': return t("The WARP relay refused the access key. Check the worker key in Settings.");
        case 'origin': return t("The WARP relay does not serve this site. A self-hosted editor needs its address in the relay's ALLOWED_ORIGINS.");
        case 'rate_limited': return t("Cloudflare is limiting registrations right now. Wait a minute and try again.");
        case 'not_relay': return t("That URL does not answer as a WARP relay. Check the worker URL in Settings.");
        case 'network': return t("The WARP relay could not be reached: {message}", { message: error.message });
        default: return t("WARP registration failed: {message}", { message: error.message });
    }
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

interface CallOptions {
    body?: unknown;
    /** The device token, for calls about one device. */
    token?: string;
    fetchImpl?: Fetch;
    timeoutMs?: number;
}

/** One call to the relay, its JSON answer back, every failure as a RelayError with a code. */
export const relayCall = async (relay: WarpRelay, method: string, path: string, options: CallOptions = {}): Promise<any> => {
    const { body, token, fetchImpl = fetch, timeoutMs = 15000 } = options;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (relay.key) headers['X-Xcui-Key'] = relay.key;
    if (token) headers['X-Warp-Token'] = token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
        response = await fetchImpl(`${relay.url}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error: any) {
        throw new RelayError('network', error?.message || 'The relay could not be reached.');
    }

    const text = await response.text();
    let json: any;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    if (response.ok) {
        if (json === null) throw new RelayError('bad_response', 'The relay answered with something that is not JSON.', response.status);
        return json;
    }

    const message = typeof json?.message === 'string' ? json.message : text.slice(0, 120);
    if (response.status === 401) throw new RelayError('no_key', message || 'The relay refused the access key.', 401);
    if (response.status === 403 && json?.error === 'origin') throw new RelayError('origin', message, 403);
    if (response.status === 429) throw new RelayError('rate_limited', message || 'Rate limited.', 429);
    if (response.status === 404 || response.status === 405) {
        throw new RelayError('not_relay', message || 'That URL does not answer as a WARP relay.', response.status);
    }
    throw new RelayError('upstream', message || `The relay answered ${response.status}.`, response.status);
};

/** Whether the relay answers, and takes the key. */
export const pingRelay = async (relay: WarpRelay, fetchImpl?: Fetch): Promise<{ version: number }> => {
    const json = await relayCall(relay, 'GET', '/v2/ping', { fetchImpl, timeoutMs: 8000 });
    if (json?.ok !== true) throw new RelayError('not_relay', 'That URL does not answer as a WARP relay.');
    return { version: Number(json.version) || 0 };
};

export const registerDevice = (relay: WarpRelay, publicKey: string, fetchImpl?: Fetch) =>
    relayCall(relay, 'POST', '/v2/reg', { body: { key: publicKey }, fetchImpl });

export const readDeviceRaw = (relay: WarpRelay, id: string, token: string, fetchImpl?: Fetch) =>
    relayCall(relay, 'GET', `/v2/reg/${encodeURIComponent(id)}`, { token, fetchImpl });

export const updateDevice = (relay: WarpRelay, id: string, token: string, patch: Record<string, unknown>, fetchImpl?: Fetch) =>
    relayCall(relay, 'PATCH', `/v2/reg/${encodeURIComponent(id)}`, { body: patch, token, fetchImpl });
