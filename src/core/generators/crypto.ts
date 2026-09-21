import nacl from 'tweetnacl';

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

/**
 * Generates a random Reality spiderX path.
 * Usually a / followed by 4-8 random chars.
 */
export const generateRealitySpiderX = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '/';
    const len = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

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
