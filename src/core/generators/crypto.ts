import nacl from 'tweetnacl';
import { ss2022KeyBytes } from '../xray/shadowsocks-keys';

/**
 * Generates a v4 UUID using native crypto when available.
 */
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Generates a random hex string of given length.
 * Used for XHTTP shortId and similar fields.
 */
export const generateShortId = (length = 8): string => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generates a Reality X25519 key pair (url-safe base64, no padding).
 */
export const generateRealityKeyPair = (): { privateKey: string; publicKey: string } => {
    const keypair = nacl.box.keyPair();
    const encode = (bytes: Uint8Array) =>
        btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    return {
        privateKey: encode(keypair.secretKey),
        publicKey: encode(keypair.publicKey),
    };
};

const b64urlDecode = (value: string): Uint8Array => {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
};

const b64urlEncode = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

/**
 * Derive a REALITY public key from its private key (X25519 base point
 * multiplication) — the same relationship `xray x25519` prints as a pair.
 *
 * A server inbound stores only the private half; a client needs the public
 * half. Deriving it is what lets a client outbound be built from a server
 * config instead of asking the user to copy a key they may not have.
 *
 * Returns null for input that is not a 32-byte url-safe base64 key, since the
 * alternative is silently emitting a key that cannot work.
 */
export const publicKeyFromPrivateKey = (privateKey: string): string | null => {
    if (!privateKey || typeof privateKey !== 'string') return null;
    try {
        const bytes = b64urlDecode(privateKey.trim());
        if (bytes.length !== 32) return null;
        return b64urlEncode(nacl.scalarMult.base(bytes));
    } catch {
        return null;
    }
};

/**
 * Alias kept for call sites that historically imported this name from the
 * now-removed `utils/crypto.ts` duplicate. Functionally identical to
 * generateRealityKeyPair — same X25519 keypair, same encoding.
 */
export const generateX25519Keys = generateRealityKeyPair;

// ── WireGuard keys ──────────────────────────────────────────────────────
// The same curve as REALITY and a different spelling of the result: REALITY
// keys are url-safe base64 without padding, WireGuard's are standard base64
// with it — what `wg genkey` prints, and what `xray wg` prints
// (v26.7.28:main/commands/all/curve25519.go:14, StdEncoding for that command).

const b64Encode = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

/** Unpadded base64 the way Go's Raw*Encoding reads it: CR and LF skipped, nothing else forgiven. */
const rawBase64Decode = (text: string, urlSafe: boolean): Uint8Array | null => {
    const body = text.replace(/[\r\n]/g, '');
    if (!(urlSafe ? /^[A-Za-z0-9_-]*$/ : /^[A-Za-z0-9+/]*$/).test(body) || body.length % 4 === 1) return null;
    try {
        return b64urlDecode(body);
    } catch {
        return null;
    }
};

/**
 * The bytes the core makes of a WireGuard key, or null where it refuses one.
 *
 * Mirrors ParseWireGuardKey, which is the same function on every supported
 * line (v26.3.27:infra/conf/wireguard.go:126, v26.7.28:infra/conf/wireguard.go:148,
 * v26.9.9:infra/conf/wireguard.go:150): an empty string is refused; exactly
 * 64 hex characters are taken as they are; anything else loses ONE trailing
 * "=" and is read as unpadded base64 — the standard alphabet if it has a "+"
 * or "/" in it, the url-safe one otherwise.
 *
 * It does not look at the length, and neither does this: a string that
 * decodes to 16 bytes passes here and fails later, where the inbound is
 * started. Callers that need a usable key check for 32 bytes themselves.
 */
export const parseWireguardKey = (key: unknown): Uint8Array | null => {
    if (typeof key !== 'string' || key === '') return null;
    if (key.length === 64 && /^[0-9a-fA-F]{64}$/.test(key)) {
        return Uint8Array.from(key.match(/../g) ?? [], pair => parseInt(pair, 16));
    }
    const body = key.endsWith('=') ? key.slice(0, -1) : key;
    return rawBase64Decode(body, !/[+/]/.test(body));
};

/**
 * The public key that goes with a WireGuard secret key — the half the peer on
 * the other side is given. Null unless the secret is a 32-byte key.
 */
export const wireguardPublicKey = (secretKey: unknown): string | null => {
    const bytes = parseWireguardKey(secretKey);
    return bytes && bytes.length === 32 ? b64Encode(nacl.scalarMult.base(bytes)) : null;
};

/**
 * A fresh WireGuard key pair.
 *
 * The secret is clamped before it is shown, as `xray wg` and `wg genkey` do
 * (v26.7.28:main/commands/all/curve25519.go:51-53) — the curve clamps on
 * every use anyway, so this changes no result; it only means the key shown
 * here is the one those tools would print for it.
 */
export const generateWireguardKeyPair = (): { secretKey: string; publicKey: string } => {
    const secret = Uint8Array.from(nacl.box.keyPair().secretKey);
    secret[0] = secret[0]! & 248;
    secret[31] = (secret[31]! & 127) | 64;
    return { secretKey: b64Encode(secret), publicKey: b64Encode(nacl.scalarMult.base(secret)) };
};

/**
 * A pre-shared key: 32 random bytes with no structure to them, in the same
 * base64 as the other two — what `wg genpsk` prints. Both ends of one peer
 * hold the same one.
 */
export const generateWireguardPresharedKey = (): string =>
    b64Encode(crypto.getRandomValues(new Uint8Array(32)));

/**
 * A key for a Shadowsocks 2022 method: as many random bytes as the method
 * takes (16 for aes-128, 32 for the others), in padded base64 — what
 * `openssl rand -base64 N` prints. A hex id is not one: it decodes to the
 * wrong number of bytes, and the core refuses the inbound.
 */
export const generateShadowsocks2022Key = (method: string): string =>
    b64Encode(crypto.getRandomValues(new Uint8Array(ss2022KeyBytes(method))));

/** Longest shortId REALITY accepts: 8 bytes, so 16 hex characters. */
export const MAX_SHORT_ID_LENGTH = 16;

export interface ShortIdOptions {
    /** Hex characters per id. Clamped to 1…16. Omit for a mix of 8 and 16. */
    length?: number;
    /** Ids to keep and not collide with. */
    existing?: string[];
}

/**
 * Generates a batch of REALITY shortIds.
 *
 * Distinct by construction: a server matches a client by its shortId, so two
 * identical entries in `shortIds` are one wasted slot and a confusing config
 * rather than an error the core will report.
 *
 * `existing` lets a caller extend a list without colliding with what is
 * already in it, which is what "generate a few more" has to mean — replacing
 * the list would throw away ids that clients are already using.
 */
export const generateRealityShortIds = (count = 1, options: ShortIdOptions = {}): string[] => {
    const wanted = Math.max(0, Math.floor(count));
    const fixed = options.length === undefined
        ? undefined
        : Math.min(MAX_SHORT_ID_LENGTH, Math.max(1, Math.floor(options.length)));

    const taken = new Set((options.existing ?? []).map(id => id.toLowerCase()));
    const made: string[] = [];

    // 16 hex characters is 2^64 values, so a collision needs many attempts to
    // be worth worrying about — but a 1-character length has 16, and looping
    // forever on an impossible request is not an option.
    let attempts = 0;
    const budget = wanted * 50 + 100;
    while (made.length < wanted && attempts < budget) {
        attempts += 1;
        const id = generateShortId(fixed ?? (Math.random() > 0.5 ? 8 : MAX_SHORT_ID_LENGTH));
        if (taken.has(id)) continue;
        taken.add(id);
        made.push(id);
    }
    return made;
};
